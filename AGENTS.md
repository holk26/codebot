# Agent Instructions

## Project Overview

This is **Codebot** — a dual-agent AI system for automated GitHub issue resolution. The system receives GitHub webhooks, analyzes issues using LLMs, and automatically generates code fixes by delegating to an executor agent.

The project is primarily documented in **Spanish** (see `README.md`, comments, and commit messages). Code comments and docstrings are in English.

### Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Nanobot Orchestrator** | Python 3.11 + FastAPI | Receives webhooks, analyzes issues, delegates to executor |
| **OpenCode Executor** | Node.js 22 + opencode-ai CLI | Runs native `opencode web` in headless server mode |
| **Frontend Dashboard** | React 19 + TypeScript + Vite | "NanoBot Console" management UI |
| **Redis** | Redis 7 Alpine | Task queue, caching, state |

### Workflow

1. GitHub sends a webhook when an issue is opened/reopened
2. Nanobot validates HMAC signature and analyzes the issue with an LLM
3. If code changes are needed, Nanobot delegates to OpenCode executor
4. OpenCode clones the repo, creates a session, analyzes code, and makes changes
5. Nanobot commits changes, pushes a branch, and opens a Pull Request
6. Nanobot comments on the issue with the PR link

---

## Architecture

```
Internet
    |
    | HTTPS (TLS 1.3 via Dokploy)
    v
+------------------------+     +------------------------+
| Dokploy Reverse Proxy  |     | OpenCode Executor      |
| (SSL, domain routing)  |     | - NOT exposed publicly |
|                        |     | - API Key required     |
+-----------+------------+     | - Internal network only|
            |                  +------------------------+
            | HTTP                        ^
            v                             | API Key
+------------------------+                | (internal network)
| Nanobot Orchestrator   |----------------+
| - Webhook validation   |
| - nanobot-ai LLM       |
| - Telegram notific.    |
| - Audit logging        |
+-----------+------------+
            |
            | API GitHub
            v
      +-----------+
      |  GitHub   |
      |  Issues   |
      +-----------+
```

### Docker Compose Services

- **3 services**: `redis`, `nanobot-orchestrator`, `opencode-executor`
- **2 isolated networks**:
  - `public` (bridge): Internet-facing via Dokploy — only Nanobot webhook
  - `internal` (internal, no outbound): Nanobot ↔ OpenCode ↔ Redis
- **Shared volume**: `/workspace` for repository code
- **Redis**: Password-protected, internal network only

### Ports

| Service | Port | Exposure |
|---------|------|----------|
| nanobot-orchestrator | 8080 | Public (webhook + dashboard) |
| nanobot-orchestrator | 8081 | Public (nanobot gateway WebSocket) |
| opencode-executor | 8001 | Internal only |
| redis | 6379 | Internal only |

### Dashboard Integration

The React frontend (`app/`) is **built into the nanobot-orchestrator Docker image** and served statically by FastAPI:

- **Root path `/`**: Serves the React SPA (dashboard)
- **Path `/dashboard/`**: Static files mount point
- **API paths `/api/*`, `/webhook/*`, `/health`**: Backend endpoints (not intercepted by SPA routing)

This means:
- No separate frontend service needed in Docker Compose
- No CORS issues in production (same origin)
- The dashboard consumes real-time data from `/api/dashboard/*` endpoints

#### Dashboard API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboard/health` | GET | Health status of all services (nanobot, opencode, redis) |
| `/api/dashboard/stats` | GET | System stats (memory, queue, processes, config) |
| `/api/dashboard/logs` | GET | Buffered log entries with filtering (level, process, limit) |
| `/api/dashboard/tasks` | GET | Task queue status (pending count) |
| `/api/dashboard/tasks/trigger` | POST | Manually trigger a fix-issue task |

#### Frontend API Client

- `app/src/services/api.ts`: HTTP client for all dashboard endpoints
- `app/src/hooks/useDashboard.ts`: React hooks (`useHealth`, `useStats`, `useLogs`, `useTasks`) with polling
- Pages connected: `Home`, `Process`, `Logs` (real-time data)

---

## Directory Structure

```
codebot/
├── AGENTS.md                     # This file
├── README.md                     # Main docs (Spanish)
├── SECURITY.md                   # Security hardening guide
├── docker-compose.yml            # 3-service orchestration
├── .env.example                  # Environment template
├── setup.sh                      # Secure secret generation
├── start.sh                      # Local dev startup
├── stop.sh                       # Service shutdown
│
├── app/                          # React frontend dashboard
│   ├── package.json              # Node dependencies
│   ├── vite.config.ts            # Vite build config
│   ├── tsconfig.json             # TypeScript project references
│   ├── tailwind.config.js        # Tailwind CSS theme
│   ├── postcss.config.js         # PostCSS config
│   ├── eslint.config.js          # ESLint flat config
│   ├── components.json           # shadcn/ui configuration
│   ├── index.html                # HTML entry point
│   ├── public/                   # Static assets
│   └── src/
│       ├── main.tsx              # React entry (HashRouter)
│       ├── App.tsx               # Route definitions
│       ├── index.css             # Tailwind directives + CSS vars
│       ├── styles/theme.css      # Custom dark theme tokens
│       ├── lib/utils.ts          # cn() helper (clsx + tailwind-merge)
│       ├── hooks/use-mobile.ts   # Mobile breakpoint hook
│       ├── components/
│       │   ├── Layout.tsx        # Sidebar + top bar layout
│       │   ├── Navbar.tsx        # Collapsible sidebar navigation
│       │   ├── Footer.tsx        # Status footer with live clock
│       │   └── ui/               # 50+ shadcn/ui components
│       └── pages/
│           ├── Home.tsx          # Dashboard (stats, quick actions)
│           ├── Onboarding.tsx    # Setup wizard
│           ├── Install.tsx       # Installation manager
│           ├── Configure.tsx     # Configuration UI
│           ├── Process.tsx       # Process manager
│           ├── Logs.tsx          # Log viewer
│           ├── Services.tsx      # Service manager
│           └── Updates.tsx       # Update manager
│
├── nanobot-orchestrator/         # Python orchestrator service
│   ├── Dockerfile                # Multi-stage, non-root build
│   ├── entrypoint.sh             # Starts nanobot gateway + FastAPI
│   ├── requirements.txt          # Python dependencies
│   ├── generate_config.py        # Renders nanobot config from env
│   ├── AGENTS.md                 # Nanobot-specific agent context
│   ├── config/
│   │   └── nanobot.json          # Nanobot config template
│   ├── skills/
│   │   ├── help/SKILL.md         # Help skill for nanobot
│   │   ├── status/SKILL.md       # Status check skill
│   │   └── opencode/SKILL.md     # Issue fixing skill
│   └── src/
│       ├── main.py               # FastAPI app (webhook + API)
│       ├── config.py             # Settings (pydantic-style class)
│       ├── webhook_server.py     # GitHub webhook receiver (HMAC)
│       ├── issue_analyzer.py     # LLM-based issue analysis
│       ├── opencode_client.py    # HTTP client to OpenCode executor
│       ├── git_manager.py        # Git operations (clone, branch, PR)
│       ├── github_client.py      # PyGithub wrapper
│       ├── task_queue.py         # Redis-based task queue
│       └── worker.py             # Background worker
│
├── opencode-executor/            # Node.js executor service
│   ├── Dockerfile                # node:22-slim, installs opencode-ai
│   └── entrypoint.sh             # Configures auth, starts opencode web
│
├── shared/                       # Shared Python modules
│   ├── security.py               # HMAC, rate limiting, API key auth
│   └── middleware.py             # FastAPI security headers + audit log
│
└── security/                     # Empty placeholder directory
```

---

## Technology Stack

### Backend (Nanobot Orchestrator)

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Python | 3.11 |
| Framework | FastAPI | >=0.104.0 |
| Server | Uvicorn | >=0.24.0 |
| HTTP Client | httpx | >=0.25.0 |
| GitHub API | PyGithub | >=2.1.0 |
| Queue | Redis | >=5.0.0 |
| AI Framework | nanobot-ai | >=0.1.5 |
| Config | python-dotenv | >=1.0.0 |
| Validation | pydantic | >=2.5.0 |

### Executor (OpenCode)

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | 22 |
| CLI Tool | opencode-ai | latest (npm global) |
| Server Mode | `opencode web` | Native REST API |

### Frontend (Dashboard)

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | ^19.2.0 |
| Language | TypeScript | ~5.9.3 |
| Build Tool | Vite | ^7.2.4 |
| Routing | react-router-dom | ^7.14.2 |
| Styling | Tailwind CSS | ^3.4.19 |
| UI Components | shadcn/ui | 50+ Radix-based components |
| Animation | Framer Motion | ^12.38.0 |
| Charts | Recharts | ^2.15.4 |
| Icons | Lucide React | ^0.562.0 |
| State | Zustand | ^5.0.12 |
| Forms | React Hook Form + Zod | ^7.70.0 + ^4.3.5 |
| Linting | ESLint + typescript-eslint | ^9.39.1 + ^8.46.4 |

### Infrastructure

| Component | Technology |
|-----------|-----------|
| Orchestration | Docker Compose |
| Database | Redis 7 Alpine |
| Reverse Proxy | Dokploy (Traefik + Let's Encrypt) |
| Networks | `public` (internet) + `internal` (isolated) |

---

## Key Configuration Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Service orchestration with 2 networks, healthchecks, security opts |
| `.env` | Environment configuration (chmod 600, never commit) |
| `nanobot-orchestrator/config/nanobot.json` | Nanobot-ai config template (rendered at runtime) |
| `nanobot-orchestrator/requirements.txt` | Python dependencies |
| `app/package.json` | Node.js frontend dependencies |
| `app/vite.config.ts` | Vite build configuration |
| `app/tailwind.config.js` | Tailwind CSS theme and animations |
| `app/tsconfig.json` | TypeScript project references |
| `app/eslint.config.js` | ESLint flat config |
| `app/components.json` | shadcn/ui configuration |

---

## Build & Run Commands

### Initial Setup

```bash
./setup.sh      # Generates secure secrets, creates .env
```

### Local Development

```bash
./start.sh      # Validates .env, starts Docker Compose, health checks
./stop.sh       # Stops all services
docker compose logs -f  # View logs
```

### Frontend (app/)

```bash
cd app/
npm install
npm run dev       # Vite dev server on port 3000 (proxies /api to localhost:8080)
npm run build     # tsc -b && vite build
npm run lint      # ESLint
npm run preview   # Preview production build
```

**Dev mode**: The Vite dev server proxies `/api`, `/webhook`, and `/health` to `http://localhost:8080`, so the frontend can communicate with the backend without CORS issues.

**Production**: The frontend is built and served statically by FastAPI from `/app/static` (mounted at `/dashboard/`).

### Docker Compose

```bash
docker compose up -d
docker compose logs -f nanobot-orchestrator
docker compose logs -f opencode-executor
docker compose ps
docker compose restart nanobot-orchestrator
```

---

## Deployment (Dokploy)

1. Push code to Git repository
2. In Dokploy: Create Service → Compose → Select repo
3. Add environment variables from `.env`
4. Set domain for `nanobot-orchestrator` service
5. Deploy

Dokploy automatically handles SSL (Let's Encrypt), reverse proxy, and domain routing.

---

## Coding Conventions

### Python (Backend)

- Python 3.11+
- FastAPI for HTTP APIs
- Async/await patterns throughout
- Type hints where practical
- Pydantic-style settings via `src/config.py` (plain class, not Pydantic models)
- httpx for async HTTP calls
- PyGithub for GitHub API
- Background tasks for webhook processing (`BackgroundTasks`)
- Subprocess-based Git operations wrapped in `asyncio.to_thread()`
- Structured logging with `logging` module
- Security audit logger: `logging.getLogger("security.audit")`

### TypeScript/React (Frontend)

- React 19 with TypeScript strict mode
- Functional components with hooks
- HashRouter for static deployment compatibility
- `cn()` utility for conditional Tailwind classes (from `clsx` + `tailwind-merge`)
- CSS variables for theming (dark mode only)
- Framer Motion for animations
- shadcn/ui components with Radix primitives
- Lucide icons exclusively
- Inline styles + Tailwind hybrid approach

### General

- AGENTS.md files at root and in `nanobot-orchestrator/` for AI agent context
- SKILL.md files in `nanobot-orchestrator/skills/` for nanobot capabilities
- Shared module (`shared/`) for security utilities used by both services
- Entrypoint scripts (`entrypoint.sh`) for container initialization
- Config generation via Python script rather than envsubst for complex logic
- Dashboard frontend is built into the nanobot-orchestrator image (multi-stage Dockerfile with Node.js build)

---

## Testing

**No formal test suite exists** — no Jest, Vitest, pytest, or Playwright configs found.

### Manual Testing

Simulate webhook with curl (requires correct secret):

```bash
SECRET="tu_webhook_secret"
PAYLOAD='{"action":"opened","issue":{"number":1,"title":"Test","body":"Test body"},"repository":{"full_name":"owner/repo"}}'
SIGNATURE="sha256=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')"

curl -X POST https://TU_DOMINIO/webhook/github \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: issues" \
  -H "X-Hub-Signature-256: $SIGNATURE" \
  -d "$PAYLOAD"
```

### Dashboard Testing

Access the dashboard at `http://localhost:8080/` (when running Docker) or `http://localhost:3000/` (Vite dev server).

API endpoints:
```bash
curl http://localhost:8080/api/dashboard/health
curl http://localhost:8080/api/dashboard/stats
curl http://localhost:8080/api/dashboard/logs?limit=50
```

### Health Check Endpoints

- Nanobot: `GET /health` → `{"status": "ok", "service": "nanobot-orchestrator"}`
- Dashboard: `GET /api/dashboard/health` → comprehensive service health
- OpenCode: `GET /global/health` (requires Basic Auth)

---

## Security Model

### Authentication Layers

| Layer | Implementation |
|-------|---------------|
| Webhook Validation | HMAC-SHA256 (mandatory, no bypass) |
| Service Auth | `X-Internal-API-Key` header between services |
| OpenCode Auth | HTTP Basic Auth (`OPENCODE_SERVER_PASSWORD`) |
| Rate Limiting | 30 req/min per IP (application-level, in-memory) |

### Network Security

- **2 isolated Docker networks**: `public` and `internal`
- OpenCode executor is on `internal` network only — never exposed to internet
- Redis is on `internal` network only

### Container Hardening

| Measure | Implementation |
|---------|---------------|
| Non-root user | `USER appuser` (UID 1000) |
| Dropped capabilities | `cap_drop: [ALL]` |
| Minimal capabilities | `cap_add: [SETGID, SETUID, DAC_OVERRIDE]` |
| No new privileges | `security_opt: no-new-privileges:true` |
| Read-only fs | Enabled on Redis; disabled on Nanobot (runtime writes) |
| tmpfs | `/tmp` mounted as memory filesystem |
| Multi-stage build | Build dependencies in separate stage |
| No secrets in images | All secrets via env vars |

### API Security Headers

All responses include:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`
- `Content-Security-Policy: default-src 'none'; ...`

### Audit Logging

All requests logged with:
- Timestamp
- Client IP (from X-Forwarded-For)
- HTTP method and path
- User agent
- Response status code
- Request duration

### Disabled Attack Surfaces

| Feature | Status | Reason |
|---------|--------|--------|
| FastAPI docs (/docs) | DISABLED | Information disclosure |
| FastAPI ReDoc (/redoc) | DISABLED | Information disclosure |
| OpenAPI schema | DISABLED | API enumeration |
| OpenCode port 8001 | NOT EXPOSED | Internal service only |

---

## LLM Configuration

Supported providers: moonshot, openrouter, openai, anthropic, deepseek, google, mistral

### Environment Variables

```bash
# Nanobot Orchestrator LLM
NANOBOT_LLM_PROVIDER=moonshot
NANOBOT_LLM_MODEL=kimi-k2.6

# OpenCode Executor LLM
OPENCODE_LLM_PROVIDER=moonshot
OPENCODE_LLM_API_KEY=sk-...
OPENCODE_LLM_MODEL=moonshotai/kimi-k2.6
```

### Provider API Keys

Only set the keys for providers you use:
- `MOONSHOT_API_KEY`
- `OPENROUTER_API_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `DEEPSEEK_API_KEY`
- `GOOGLE_API_KEY`
- `MISTRAL_API_KEY`

---

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `INTERNAL_API_KEY` | Service-to-service auth (auto-generated by setup.sh) |
| `REDIS_PASSWORD` | Database auth (auto-generated by setup.sh) |
| `GITHUB_TOKEN` | GitHub PAT with `repo`, `write:discussion` scopes |
| `GITHUB_REPO` | Repository to monitor (format: `owner/repo`) |
| `GITHUB_WEBHOOK_SECRET` | Webhook validation secret (auto-generated) |
| `NANOBOT_LLM_PROVIDER` | LLM provider for orchestrator |
| `NANOBOT_LLM_MODEL` | LLM model for orchestrator |
| `OPENCODE_LLM_API_KEY` | API key for executor |
| `OPENCODE_LLM_MODEL` | Model for executor |
| `OPENCODE_SERVER_PASSWORD` | Basic auth password for executor |

### Optional

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Telegram notifications |
| `TELEGRAM_ALLOWED_USER_IDS` | Comma-separated allowed user IDs (or `*`) |
| `DISCORD_BOT_TOKEN` / `DISCORD_GUILD_ID` | Discord integration |
| `SLACK_BOT_TOKEN` / `SLACK_CHANNEL` | Slack integration |
| `GITHUB_APP_ID` / `GITHUB_PRIVATE_KEY` | GitHub App auth (preferred over PAT) |

### Service Config

| Variable | Default | Description |
|----------|---------|-------------|
| `WEBHOOK_PORT` | 8080 | Nanobot webhook port |
| `WEBHOOK_HOST` | 0.0.0.0 | Nanobot bind host |
| `WORKSPACE_DIR` | /workspace | Shared volume for repos |
| `ALLOWED_ACTIONS` | opened,reopened,edited | GitHub issue actions to process |
| `SKIP_LABEL` | agent-skip | Label to skip processing |
| `LOG_LEVEL` | INFO | Logging level |
| `NANOBOT_GATEWAY_PORT` | 8081 | Nanobot WebSocket gateway port |

---

## Modifying Security Settings

- **Rate limits**: Edit `shared/security.py` → `SimpleRateLimiter`
- **IP whitelist**: Add logic in `nanobot-orchestrator/src/webhook_server.py`
- **CORS**: Edit CORS middleware in `nanobot-orchestrator/src/main.py`
- **Security headers**: Edit `shared/middleware.py`

---

## Important Notes

- `.env` must have `chmod 600` and never be committed
- The webhook secret in GitHub MUST match `GITHUB_WEBHOOK_SECRET`
- OpenCode executor uses native `opencode serve` with HTTP Basic Auth
- Max execution time: 600 seconds per task (opencode default timeout)
- FastAPI docs (`/docs`, `/redoc`, `/openapi.json`) are disabled in production
- No CI/CD pipelines configured (no `.github/workflows/`)
- No formal test infrastructure (no pytest, jest, vitest, or playwright configs)
- No Python linting/formatting configuration (no black, ruff, or flake8)
- The `security/` directory at root is empty (placeholder)
