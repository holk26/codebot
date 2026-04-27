#!/bin/bash
# Stop all services securely

set -euo pipefail

COMPOSE_CMD=$(docker compose version &> /dev/null && echo "docker compose" || echo "docker-compose")

echo "Stopping GitHub AI Agent services..."
$COMPOSE_CMD down

echo "Services stopped."
