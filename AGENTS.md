# Agent Instructions

## Project Overview
This project implements a dual-agent AI system for automated GitHub issue resolution:
- **Nanobot Orchestrator**: Receives webhooks, analyzes issues, delegates to executor
- **OpenCode Executor**: Executes code changes, creates PRs

## Architecture
- Docker Compose orchestrates 3 services: `redis`, `nanobot-orchestrator`, `opencode-executor`
- Communication: HTTP API between containers via Docker network
- Shared volume: `/workspace` for repository code
- Redis: Task queue and state management

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
| `docker-compose.yml` | Service orchestration |
| `.env` | Environment configuration |
| `nanobot-orchestrator/src/webhook_server.py` | GitHub webhook receiver |
| `nanobot-orchestrator/src/issue_analyzer.py` | LLM-based issue analysis |
| `opencode-executor/src/executor.py` | Main execution engine |
| `opencode-executor/src/tools.py` | Safe tool implementations |
| `opencode-executor/src/git_utils.py` | Git operations |

## Build & Run
```bash
./setup.sh      # First time setup
./start.sh      # Start services
./stop.sh       # Stop services
docker-compose logs -f  # View logs
```

## Testing
- Health endpoints: `GET /health` on both services
- Test webhook: Use curl or GitHub webhook delivery

## LLM Configuration
Supported providers: openrouter, openai, anthropic
Configure via `.env` variables:
- `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`
- `OPENCODE_LLM_PROVIDER`, `OPENCODE_LLM_API_KEY`, `OPENCODE_LLM_MODEL`

## Security Notes
- Webhook signatures are verified via HMAC-SHA256
- Bash commands are sandboxed to `/workspace`
- Dangerous commands are blocked in `tools.py`
- Max tool calls: 50 per task
- Max execution time: 600 seconds per task
