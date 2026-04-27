# GitHub AI Agent - Security Hardening Guide

## Overview

This document describes the comprehensive security measures implemented in the Nanobot + OpenCode GitHub AI Agent system. The architecture is designed to be safely deployed via [Dokploy](https://dokploy.com).

> **Note on Dokploy**: Dokploy handles reverse proxy, SSL/TLS termination, and domain routing automatically using its internal Traefik instance. We do not run our own reverse proxy - instead we rely on Dokploy's built-in security while hardening the application layer.

## Threat Model

### Assets
- GitHub repository access (read/write)
- LLM API keys
- Internal service communication
- Webhook endpoints

### Threats Mitigated
1. **Unauthorized webhook access** → HMAC-SHA256 verification
2. **Man-in-the-middle** → TLS via Dokploy Let's Encrypt
3. **Internal service exposure** → Network segmentation + API key auth
4. **Container escape** → Non-root users, dropped capabilities, read-only filesystems
5. **Secret leakage** → Environment isolation, no secrets in images
6. **DoS attacks** → Rate limiting at application level
7. **Supply chain** → Multi-stage builds, minimal base images

## Architecture Security

```
Internet
    |
    | HTTPS (TLS 1.3 via Dokploy)
    v
+--------------------------+
| Dokploy Reverse Proxy    |
| (SSL, domain routing)    |
+--------------------------+
    |
    | (public network)
    v
+--------------------------+
| Nanobot Orchestrator     |
| - Webhook validation     |
| - Rate limiting          |
| - Audit logging          |
+--------------------------+
    |
    | HTTP + API Key (internal network)
    v
+--------------------------+
| OpenCode Executor        |
| - API key required       |
| - Sandboxed tools        |
| - No public exposure     |
+--------------------------+
    |
    | (internal network)
    v
+--------------------------+
| Redis                    |
| - Password protected     |
| - Internal network only  |
+--------------------------+
```

## Security Measures

### 1. Network Segmentation (Defense in Depth)

Two isolated Docker networks:

| Network | Type | Access |
|---------|------|--------|
| `public` | Bridge | Nanobot webhook endpoint (via Dokploy) |
| `internal` | Internal (no outbound) | Nanobot ↔ OpenCode ↔ Redis |

**Key point**: OpenCode executor is on `internal` network only. It cannot be reached from the internet even if misconfigured. Redis is also only on `internal`.

### 2. TLS / SSL (Dokploy)

- Automatic certificate provisioning via Dokploy's Let's Encrypt integration
- HTTP → HTTPS redirect handled by Dokploy
- HSTS header added by application middleware
- TLS 1.2 minimum

**Note**: We do not manage SSL certificates ourselves. Dokploy handles ACME challenges, certificate storage, and renewal automatically.

### 3. Webhook Security

**Required**:
1. **HMAC-SHA256 signature verification**: Every webhook must include valid `X-Hub-Signature-256`
2. **Rate limiting**: Max 30 req/min per IP (application-level)
3. **Optional IP whitelist**: Can be configured in webhook_server.py or at Dokploy level

**To configure GitHub IP whitelist**:
```bash
# Fetch current GitHub webhook IPs
curl -s https://api.github.com/meta | jq -r '.hooks | .[]'
# Add filtering logic in nanobot-orchestrator/src/webhook_server.py
```

### 4. Service-to-Service Authentication

Internal API communication requires a shared secret:
- Header: `X-Internal-API-Key`
- Generated during setup: `openssl rand -hex 32`
- Both services validate this on every request
- OpenCode executor rejects ALL requests without valid key
- Comparison uses `secrets.compare_digest()` (timing-attack safe)

### 5. Container Hardening

| Measure | Implementation |
|---------|---------------|
| Non-root user | `USER appuser` (UID 1000) |
| Read-only root fs | `read_only: true` in compose |
| Dropped capabilities | `cap_drop: [ALL]` |
| Minimal capabilities | `cap_add: [SETGID, SETUID, DAC_OVERRIDE]` |
| No new privileges | `security_opt: no-new-privileges:true` |
| Multi-stage build | Build dependencies in separate stage |
| No secrets in images | All secrets via env vars |
| Health checks | All services have defined healthchecks |
| tmpfs | `/tmp` mounted as memory filesystem |

### 6. Redis Security

- Password authentication required (`--requirepass`)
- Protected mode enabled
- Memory limit: 256MB with LRU eviction
- Append-only file persistence
- Only accessible via `internal` network
- No exposure to public internet

### 7. API Security Headers

All responses include:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Content-Security-Policy: default-src 'none'; ...
```

### 8. Audit Logging

All requests are logged with:
- Timestamp
- Client IP (from X-Forwarded-For)
- HTTP method and path
- User agent
- Response status code
- Request duration

View logs in Dokploy UI or via:
```bash
docker compose logs -f nanobot-orchestrator
docker compose logs -f opencode-executor
```

### 9. Disabled Attack Surfaces

| Feature | Status | Reason |
|---------|--------|--------|
| FastAPI docs (/docs) | DISABLED | Information disclosure |
| FastAPI ReDoc (/redoc) | DISABLED | Information disclosure |
| OpenAPI schema | DISABLED | API enumeration |
| OpenCode port 8001 | NOT EXPOSED | Internal service only |

## Configuration Security Checklist

Before deploying to Dokploy:

- [ ] Run `./setup.sh` to generate secure secrets
- [ ] Change all `REPLACE_ME` values in `.env`
- [ ] Set strong `GITHUB_WEBHOOK_SECRET` (must match GitHub config)
- [ ] Set `GITHUB_REPO` to owner/repo format
- [ ] Set `LLM_API_KEY` and `OPENCODE_LLM_API_KEY`
- [ ] Verify `.env` has `chmod 600` permissions
- [ ] Add `.env` to `.gitignore`
- [ ] Configure GitHub webhook with the generated secret
- [ ] (Optional) Set up GitHub IP whitelist in webhook_server.py

## Dokploy-Specific Security Notes

### Environment Variables
All secrets are passed via Dokploy's environment variable UI. Never commit `.env` to git.

### Domain Configuration
In Dokploy UI:
1. Select the `nanobot-orchestrator` service
2. Add your domain
3. Dokploy automatically handles SSL
4. The webhook URL becomes: `https://your-domain.com/webhook/github`

### No Reverse Proxy Configuration Needed
Unlike self-hosted deployments, you do NOT need to:
- Configure Traefik
- Manage SSL certificates
- Set up port forwarding for 80/443
- Configure HTTP→HTTPS redirects

Dokploy handles all of this transparently.

### Internal Network Isolation
Even though Dokploy manages the reverse proxy, our `docker-compose.yml` explicitly:
- Puts OpenCode and Redis on `internal` network only
- Does not expose any ports for these services
- This means even Dokploy cannot route traffic to them from the internet

## Secret Management

### Initial Setup
```bash
# All secrets auto-generated by setup.sh:
# - INTERNAL_API_KEY: service-to-service auth
# - REDIS_PASSWORD: database auth
# - GITHUB_WEBHOOK_SECRET: webhook validation
```

### Rotation
```bash
# 1. Stop services (in Dokploy UI or locally)
# 2. Regenerate secrets
./setup.sh

# 3. Update environment variables in Dokploy UI
# 4. Update GitHub webhook secret in repository settings
# 5. Redeploy
```

## Incident Response

### Suspected compromise
1. Immediately rotate `INTERNAL_API_KEY` and `GITHUB_TOKEN` in Dokploy UI
2. Review logs in Dokploy UI
3. Check GitHub audit log for unauthorized PRs/issues
4. Revoke and regenerate GitHub PAT

### DDoS / Rate limit triggered
1. Check application logs for source IPs
2. Enable IP whitelist in `nanobot-orchestrator/src/webhook_server.py`
3. Consider Cloudflare or similar in front of Dokploy
4. Adjust rate limiter values in `shared/security.py`

## Compliance Notes

- **SOC 2**: Audit logging implemented
- **GDPR**: No PII storage; logs rotate automatically
- **GitHub Terms**: Uses official API; respects rate limits

## Security Contacts

If you discover a vulnerability:
1. Do NOT open a public issue
2. Email security@[yourdomain].com
3. Allow 30 days for remediation before disclosure

---

*Last updated: 2026-04-26*
