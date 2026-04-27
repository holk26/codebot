# Agent Instructions

## Project Overview
This project implements a dual-agent AI system for automated GitHub issue resolution:
- **Nanobot Orchestrator**: Receives webhooks, analyzes issues, delegates to executor
- **OpenCode Executor**: Runs the native `opencode-ai` CLI in headless server mode

## Architecture
- Docker Compose orchestrates 3 services: `redis`, `nanobot-orchestrator`, `opencode-executor`
- **2 isolated networks**: `public` (internet-facing via Dokploy), `internal` (service-to-service + Redis)
- Communication: HTTPS via Dokploy for webhooks, HTTP+Basic Auth via internal network to opencode server
- Shared volume: `/workspace` for repository code
- Redis: Password-protected, internal network only

## Coding Conventions
- Python 3.11+
- FastAPI for HTTP APIs
- Async/await patterns throughout
- Type hints where practical
- Pydantic for data validation
- httpx for async HTTP calls
- PyGithub for GitHub API

## Key Files
| File | Purpose |
|------|---------|
| `docker-compose.yml` | Service orchestration with 2 networks |
| `.env` | Environment configuration (chmod 600) |
| `shared/security.py` | Shared auth, HMAC, rate limiting |
| `shared/middleware.py` | FastAPI security headers + audit logging |
| `nanobot-orchestrator/src/webhook_server.py` | GitHub webhook receiver with HMAC validation |
| `nanobot-orchestrator/src/issue_analyzer.py` | LLM-based issue analysis |
| `nanobot-orchestrator/src/opencode_client.py` | Client for native opencode REST API |
| `nanobot-orchestrator/src/git_manager.py` | Git operations (clone, branch, commit, push, PR) |
| `opencode-executor/Dockerfile` | Installs `opencode-ai` npm package |
| `opencode-executor/entrypoint.sh` | Configures auth and runs `opencode serve` |

## Build & Run
```bash
./setup.sh      # First time setup - generates secure secrets
./start.sh      # Start services locally
./stop.sh       # Stop services
docker compose logs -f  # View logs
```

## Deploy (Dokploy)
1. Push code to Git repository
2. In Dokploy: Create Service → Compose → Select repo
3. Add environment variables from `.env`
4. Set domain for `nanobot-orchestrator` service
5. Deploy

## Security Model
- **Webhook validation**: HMAC-SHA256 mandatory
- **Service auth**: `X-Internal-API-Key` header between nanobot services
- **OpenCode auth**: HTTP Basic Auth (`OPENCODE_SERVER_PASSWORD`) on opencode server
- **Network isolation**: OpenCode is on `internal` network only, never exposed directly
- **Container hardening**: Non-root, dropped capabilities, no-new-privileges
- **SSL**: Automatic via Dokploy (Let's Encrypt)
- **Rate limiting**: 30 req/min per IP (application-level)
- **Audit logging**: All requests logged with IP, method, path, status, duration

## LLM Configuration
Supported providers: moonshot, openrouter, openai, anthropic, deepseek, google, mistral
Configure via `.env` variables:
- `NANOBOT_LLM_PROVIDER`, `NANOBOT_LLM_MODEL`
- `OPENCODE_LLM_PROVIDER`, `OPENCODE_LLM_API_KEY`, `OPENCODE_LLM_MODEL`

## Security Notes
- Webhook signatures are verified via HMAC-SHA256 (mandatory, no bypass)
- OpenCode executor uses native `opencode serve` with HTTP Basic Auth
- Max execution time: 600 seconds per task (opencode default)
- FastAPI docs (`/docs`, `/redoc`, `/openapi.json`) are disabled in production
- `.env` must have `chmod 600` and never be committed

## Modifying Security Settings
- **Rate limits**: Edit `shared/security.py` → `SimpleRateLimiter`
- **IP whitelist**: Add logic in `nanobot-orchestrator/src/webhook_server.py`
- **CORS**: Edit CORS middleware in `nanobot-orchestrator/src/main.py`
- **Security headers**: Edit `shared/middleware.py`
