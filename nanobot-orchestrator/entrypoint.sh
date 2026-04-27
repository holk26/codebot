#!/bin/sh
# ============================================
# Nanobot Orchestrator Entrypoint
# 1. Renders nanobot config from template with env vars
# 2. Starts the orchestrator webhook server
# ============================================

set -e

NANOBOT_CONFIG_DIR="${HOME}/.nanobot"
NANOBOT_CONFIG_FILE="${NANOBOT_CONFIG_DIR}/config.json"
TEMPLATE_FILE="/app/config/nanobot.json.template"

echo "[entrypoint] Preparing nanobot configuration..."

# Create nanobot config directory
mkdir -p "${NANOBOT_CONFIG_DIR}/data" "${NANOBOT_CONFIG_DIR}/logs"

# Render template with environment variables
if [ -f "${TEMPLATE_FILE}" ]; then
    echo "[entrypoint] Rendering nanobot config from template..."
    envsubst < "${TEMPLATE_FILE}" > "${NANOBOT_CONFIG_FILE}"
    echo "[entrypoint] Nanobot config written to ${NANOBOT_CONFIG_FILE}"
else
    echo "[entrypoint] WARNING: Template not found at ${TEMPLATE_FILE}"
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

echo "[entrypoint] Starting Nanobot Orchestrator..."

# Start the FastAPI webhook server
exec python -m src.main
