#!/bin/sh
# ============================================
# Nanobot Orchestrator Entrypoint
# 1. Generates nanobot config via Python
# 2. Copies custom skills to workspace
# 3. Starts nanobot gateway (native WebSocket server)
# 4. Starts webhook server (FastAPI)
# ============================================

set -e

echo "[entrypoint] HOME=${HOME}"
echo "[entrypoint] Config dir=${HOME}/.nanobot"

# Create directories
mkdir -p "${HOME}/.nanobot/data" "${HOME}/.nanobot/logs" "${HOME}/.nanobot/skills"

# Generate nanobot config using Python
python3 /app/generate_config.py

# Copy project context (AGENTS.md) to nanobot workspace
if [ -f "/app/AGENTS.md" ]; then
    echo "[entrypoint] Copying project context..."
    cp /app/AGENTS.md "${HOME}/.nanobot/AGENTS.md"
    echo "[entrypoint] AGENTS.md copied to ${HOME}/.nanobot/"
fi

# Copy custom skills to nanobot workspace
if [ -d "/app/skills" ]; then
    echo "[entrypoint] Copying custom skills..."
    cp -r /app/skills/* "${HOME}/.nanobot/skills/" 2>/dev/null || true
    echo "[entrypoint] Skills copied to ${HOME}/.nanobot/skills/"
else
    echo "[entrypoint] No custom skills found at /app/skills"
fi

# Validate required secrets
if [ -z "${INTERNAL_API_KEY}" ]; then
    echo "[entrypoint] ERROR: INTERNAL_API_KEY is not set"
    exit 1
fi

if [ -z "${REDIS_PASSWORD}" ]; then
    echo "[entrypoint] ERROR: REDIS_PASSWORD is not set"
    exit 1
fi

if [ -z "${GITHUB_WEBHOOK_SECRET}" ]; then
    echo "[entrypoint] WARNING: GITHUB_WEBHOOK_SECRET is not set - webhooks will be rejected"
fi

# Check if config was generated
if [ ! -f "${HOME}/.nanobot/config.json" ]; then
    echo "[entrypoint] ERROR: Config file was not generated!"
    exit 1
fi

echo "[entrypoint] Config generated successfully."

# Start nanobot gateway in background
echo "[entrypoint] Starting nanobot gateway..."
if [ -n "${NANOBOT_GATEWAY_PORT}" ]; then
    nanobot gateway --port "${NANOBOT_GATEWAY_PORT}" &
else
    nanobot gateway &
fi
NANOBOT_GATEWAY_PID=$!
echo "[entrypoint] Nanobot gateway started with PID ${NANOBOT_GATEWAY_PID}"

sleep 3

if ! kill -0 "${NANOBOT_GATEWAY_PID}" 2>/dev/null; then
    echo "[entrypoint] ERROR: Nanobot gateway failed to start!"
    exit 1
fi

echo "[entrypoint] Starting Nanobot Orchestrator webhook server (port 8080)..."
exec python -m src.main
