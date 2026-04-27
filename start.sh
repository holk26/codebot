#!/bin/bash
# Start script for local development/testing
# For Dokploy, use the Dokploy UI to deploy

set -euo pipefail

COMPOSE_CMD=$(docker compose version &> /dev/null && echo "docker compose" || echo "docker-compose")

echo "Starting GitHub AI Agent services..."

# Validate .env exists
if [ ! -f .env ]; then
    echo "ERROR: .env file not found. Run ./setup.sh first."
    exit 1
fi

# Check for placeholder values
if grep -q "REPLACE_ME" .env; then
    echo "WARNING: .env still contains placeholder values. Please edit it first."
    exit 1
fi

# Check for weak secrets
if grep -q "INTERNAL_API_KEY=change_me" .env 2>/dev/null || grep -q "REDIS_PASSWORD=change_me" .env 2>/dev/null; then
    echo "ERROR: Default secrets detected. Run ./setup.sh to regenerate secure secrets."
    exit 1
fi

# Start services
$COMPOSE_CMD up -d

# Wait for services
echo ""
echo "Waiting for services to be ready..."
sleep 8

# Check nanobot
echo "Checking nanobot orchestrator..."
if curl -sk http://localhost:8080/health &> /dev/null; then
    echo "  Nanobot Orchestrator: OK (http://localhost:8080)"
else
    echo "  Nanobot Orchestrator: NOT READY (may need more time)"
fi

# Check opencode (native server uses /global/health with basic auth)
echo "Checking opencode executor..."
OPENCODE_PASS=$(grep "^OPENCODE_SERVER_PASSWORD=" .env 2>/dev/null | cut -d= -f2 || echo "")
if [ -n "$OPENCODE_PASS" ]; then
    if curl -sk -u "opencode:$OPENCODE_PASS" http://localhost:8001/global/health &> /dev/null; then
        echo "  OpenCode Executor: OK (http://localhost:8001)"
    else
        echo "  OpenCode Executor: NOT READY (may need more time)"
    fi
else
    echo "  OpenCode Executor: SKIP (no password configured)"
fi

echo ""
echo "Services started."
echo ""
echo "Useful commands:"
echo "  Logs:          $COMPOSE_CMD logs -f"
echo "  Stop:          ./stop.sh"
echo "  Restart:       $COMPOSE_CMD restart"
echo "  Status:        $COMPOSE_CMD ps"
echo ""
