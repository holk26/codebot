#!/bin/bash
set -e

# ============================================
# OpenCode Executor Entrypoint
# Configures auth and starts native opencode server
# ============================================

# Ensure directories exist
mkdir -p "$HOME/.local/share/opencode"
mkdir -p "$HOME/.config/opencode"

# Write auth.json with Moonshot AI credentials
if [ -n "$OPENCODE_LLM_API_KEY" ]; then
    cat > "$HOME/.local/share/opencode/auth.json" <<EOF
{
  "moonshotai": {
    "type": "api",
    "key": "$OPENCODE_LLM_API_KEY"
  }
}
EOF
    echo "[entrypoint] Configured Moonshot AI auth"
fi

# Write global opencode config
cat > "$HOME/.config/opencode/opencode.json" <<EOF
{
  "\$schema": "https://opencode.ai/config.json",
  "server": {
    "port": 8001,
    "hostname": "0.0.0.0",
    "cors": []
  },
  "model": "${OPENCODE_LLM_MODEL:-moonshotai/kimi-k2.6}",
  "enabled_providers": ["moonshotai"],
  "permission": {
    "bash": "allow",
    "write": "allow",
    "edit": "allow"
  },
  "autoupdate": false
}
EOF

echo "[entrypoint] Starting opencode serve on 0.0.0.0:8001"
echo "[entrypoint] Model: ${OPENCODE_LLM_MODEL:-moonshotai/kimi-k2.6}"

# Start opencode serve (WORKDIR /workspace sets the project directory)
exec opencode serve --hostname 0.0.0.0 --port 8001
