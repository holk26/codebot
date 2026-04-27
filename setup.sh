#!/bin/bash
# ============================================
# SECURE SETUP SCRIPT for GitHub AI Agent (Dokploy)
# DEFAULT LLM: Moonshot AI
# ============================================

set -euo pipefail

echo "============================================"
echo "GitHub AI Agent - SECURE Setup (Dokploy)"
echo "Default LLM: Moonshot AI"
echo "============================================"

# Check dependencies
echo ""
echo "[1/6] Checking dependencies..."

if ! command -v openssl &> /dev/null; then
    echo "ERROR: openssl is required for secret generation."
    exit 1
fi

echo "  OpenSSL: OK"

# Generate secrets
echo ""
echo "[2/6] Generating cryptographically secure secrets..."

INTERNAL_API_KEY=$(openssl rand -hex 32)
REDIS_PASSWORD=$(openssl rand -hex 24)
GITHUB_WEBHOOK_SECRET=$(openssl rand -hex 32)
OPENCODE_WEB_PASSWORD=$(openssl rand -hex 16)

echo "  INTERNAL_API_KEY: generated (64 hex chars)"
echo "  REDIS_PASSWORD: generated (48 hex chars)"
echo "  GITHUB_WEBHOOK_SECRET: generated (64 hex chars)"
echo "  OPENCODE_WEB_PASSWORD: generated (32 hex chars)"

# Create .env file
echo ""
echo "[3/6] Creating environment configuration..."

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
# NANOBOT ORCHESTRATOR LLM (Default: Moonshot)
# ============================================
NANOBOT_LLM_PROVIDER=moonshot
NANOBOT_LLM_MODEL=kimi-k2.6

# Provider API Keys
MOONSHOT_API_KEY=sk-REPLACE_ME
OPENROUTER_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
DEEPSEEK_API_KEY=
GOOGLE_API_KEY=
MISTRAL_API_KEY=

# ============================================
# OPENCODE EXECUTOR LLM (Default: Moonshot)
# ============================================
OPENCODE_LLM_PROVIDER=moonshot
OPENCODE_LLM_API_KEY=sk-REPLACE_ME
OPENCODE_LLM_MODEL=kimi-k2.6

# ============================================
# OPENCODE WEB ACCESS (Basic Auth)
# ============================================
# Generated automatically. Change if you want.
OPENCODE_WEB_USER=admin
OPENCODE_WEB_PASSWORD=${OPENCODE_WEB_PASSWORD}

# ============================================
# TELEGRAM INTEGRATION
# ============================================
TELEGRAM_BOT_TOKEN=

# ============================================
# OPTIONAL: DISCORD / SLACK
# ============================================
DISCORD_BOT_TOKEN=
DISCORD_GUILD_ID=
SLACK_BOT_TOKEN=
SLACK_CHANNEL=

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
NANOBOT_CONFIG_PATH=/home/appuser/.nanobot/config.json
EOF

# Set restrictive permissions on .env
echo ""
echo "[4/6] Setting secure file permissions..."
chmod 600 .env
echo "  .env permissions set to 600 (owner read/write only)"

# Create workspace directory
echo ""
echo "[5/6] Creating workspace directory..."
mkdir -p workspace
echo "  workspace/ created"

echo ""
echo "============================================"
echo "SETUP COMPLETE"
echo "============================================"
echo ""
echo "NEXT STEPS:"
echo ""
echo "1. Get a Moonshot API key:"
echo "   https://platform.kimi.ai"
echo ""
echo "2. Edit .env and set:"
echo "   - MOONSHOT_API_KEY (for Nanobot + OpenCode)"
echo "   - GITHUB_TOKEN"
echo "   - GITHUB_REPO"
echo ""
echo "3. (Optional) Set TELEGRAM_BOT_TOKEN for notifications"
echo ""
echo "4. Deploy to Dokploy:"
echo "   - Upload code to Git repository"
echo "   - In Dokploy: Create Service -> Compose -> Select repo"
echo "   - Add environment variables from .env"
echo "   - Set domain for nanobot-orchestrator service (webhooks)"
echo "   - (Optional) Set domain for opencode-executor service (web UI)"
echo "   - Deploy"
echo ""
echo "5. Configure GitHub webhook:"
echo "   https://YOUR_DOMAIN/webhook/github"
echo ""
echo "6. Access OpenCode Executor (optional):"
echo "   https://YOUR_OPCODE_DOMAIN/status"
echo "   User: admin"
echo "   Password: (see OPENCODE_WEB_PASSWORD in .env)"
echo ""
echo "IMPORTANT:"
echo "  - Keep .env file secure (chmod 600)"
echo "  - Never commit .env to git"
echo "  - The webhook secret in GitHub MUST match GITHUB_WEBHOOK_SECRET"
echo "  - OpenCode is now exposed to internet with Basic Auth protection"
echo ""
