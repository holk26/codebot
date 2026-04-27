#!/bin/sh
# ============================================
# Nanobot Orchestrator Entrypoint
# 1. Generates nanobot config via Python (robust, handles missing env vars)
# 2. Starts nanobot gateway (native WebSocket server)
# 3. Starts our webhook server (FastAPI) for GitHub webhooks
# ============================================

set -e

echo "[entrypoint] HOME=${HOME}"
echo "[entrypoint] Config dir=${HOME}/.nanobot"

# Create directories
mkdir -p "${HOME}/.nanobot/data" "${HOME}/.nanobot/logs" "${HOME}/.nanobot/skills"

# Generate nanobot config using Python (more robust than envsubst)
echo "[entrypoint] Generating nanobot config..."
python3 /app/generate_config.py

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

# Start nanobot gateway in background (native WebSocket server)
# Use default nanobot port (18790) or override with NANOBOT_GATEWAY_PORT
echo "[entrypoint] Starting nanobot gateway..."
if [ -n "${NANOBOT_GATEWAY_PORT}" ]; then
    nanobot gateway --port "${NANOBOT_GATEWAY_PORT}" &
else
    nanobot gateway &
fi
NANOBOT_GATEWAY_PID=$!
echo "[entrypoint] Nanobot gateway started with PID ${NANOBOT_GATEWAY_PID}"

# Give nanobot gateway a moment to start
sleep 3

# Verify gateway is running
if ! kill -0 "${NANOBOT_GATEWAY_PID}" 2>/dev/null; then
    echo "[entrypoint] ERROR: Nanobot gateway failed to start!"
    exit 1
fi

echo "[entrypoint] Starting Nanobot Orchestrator webhook server (port 8080)..."

# Start the FastAPI webhook server in foreground
# When this exits, the container stops
exec python -m src.main
