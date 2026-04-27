#!/bin/bash
# ============================================
# SECURE SETUP SCRIPT for GitHub AI Agent (Dokploy)
# ============================================
# This script:
# 1. Checks dependencies
# 2. Generates cryptographically secure secrets
# 3. Creates .env file
# 4. Sets correct file permissions
# ============================================

set -euo pipefail

echo "============================================"
echo "GitHub AI Agent - SECURE Setup (Dokploy)"
echo "============================================"

# Check dependencies
echo ""
echo "[1/5] Checking dependencies..."

if ! command -v openssl &> /dev/null; then
    echo "ERROR: openssl is required for secret generation."
    exit 1
fi

echo "  OpenSSL: OK"

# Generate secrets
echo ""
echo "[2/5] Generating cryptographically secure secrets..."

INTERNAL_API_KEY=$(openssl rand -hex 32)
REDIS_PASSWORD=$(openssl rand -hex 24)
GITHUB_WEBHOOK_SECRET=$(openssl rand -hex 32)

echo "  INTERNAL_API_KEY: generated (64 hex chars)"
echo "  REDIS_PASSWORD: generated (48 hex chars)"
echo "  GITHUB_WEBHOOK_SECRET: generated (64 hex chars)"

# Create .env file
echo ""
echo "[3/5] Creating environment configuration..."

if [ -f .env ]; then
    echo "  WARNING: .env already exists. Creating backup: .env.backup.$(date +%s)"
    cp .env ".env.backup.$(date +%s)"
fi

cat > .env <<EOF
# ============================================
# SECURITY SECRETS (Auto-generated)
# ============================================
INTERNAL_API_KEY=${INTERNAL_API_KEY}
REDIS_PASSWORD=${REDIS_PASSWORD}
GITHUB_WEBHOOK_SECRET=${GITHUB_WEBHOOK_SECRET}

# ============================================
# GITHUB
# ============================================
GITHUB_TOKEN=ghp_REPLACE_ME
GITHUB_REPO=owner/repository
GITHUB_APP_ID=
GITHUB_PRIVATE_KEY=

# ============================================
# LLM PROVIDERS
# ============================================
LLM_PROVIDER=openrouter
LLM_API_KEY=sk-or-v1-REPLACE_ME
LLM_MODEL=anthropic/claude-opus-4

OPENCODE_LLM_PROVIDER=openrouter
OPENCODE_LLM_API_KEY=sk-or-v1-REPLACE_ME
OPENCODE_LLM_MODEL=anthropic/claude-opus-4

# ============================================
# SERVICE CONFIG
# ============================================
WEBHOOK_PORT=8080
WEBHOOK_HOST=0.0.0.0
OPENCODE_API_PORT=8001
OPENCODE_API_HOST=0.0.0.0
WORKSPACE_DIR=/workspace
ALLOWED_ACTIONS=opened,reopened,edited
SKIP_LABEL=agent-skip
LOG_LEVEL=INFO
NANOBOT_CONFIG_PATH=/app/config/nanobot.json
EOF

# Set restrictive permissions on .env
echo ""
echo "[4/5] Setting secure file permissions..."
chmod 600 .env
echo "  .env permissions set to 600 (owner read/write only)"

# Create workspace directory
echo ""
echo "[5/5] Creating workspace directory..."
mkdir -p workspace
echo "  workspace/ created"

echo ""
echo "============================================"
echo "SETUP COMPLETE"
echo "============================================"
echo ""
echo "SECURITY CHECKLIST:"
echo "  [ ] Edit .env and set your real values (no REPLACE_ME left)"
echo "  [ ] Set GITHUB_TOKEN with 'repo' and 'write:discussion' scopes"
echo "  [ ] Set GITHUB_REPO to owner/repository format"
echo "  [ ] Set LLM_API_KEY and OPENCODE_LLM_API_KEY"
echo "  [ ] Configure GitHub webhook secret to match GITHUB_WEBHOOK_SECRET"
echo ""
echo "DOKPLOY DEPLOYMENT:"
echo "  1. Upload this project to your Git repository"
echo "  2. In Dokploy, create a new Compose deployment"
echo "  3. Point to your repository"
echo "  4. In Dokploy UI, add environment variables from .env"
echo "  5. Set domain for nanobot-orchestrator service"
echo "  6. Configure GitHub webhook to the Dokploy domain"
echo ""
echo "IMPORTANT:"
echo "  - Keep .env file secure (chmod 600)"
echo "  - Never commit .env to git"
echo "  - The webhook secret in GitHub MUST match GITHUB_WEBHOOK_SECRET in .env"
echo "  - opencode-executor is NOT exposed to the internet (internal network only)"
echo ""
