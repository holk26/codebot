#!/bin/bash
# Start script with health checks

set -e

echo "Starting GitHub AI Agent services..."

# Start services
docker-compose up -d

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 5

# Check nanobot health
echo "Checking nanobot orchestrator..."
if curl -s http://localhost:8080/health > /dev/null; then
    echo "  Nanobot Orchestrator: OK (http://localhost:8080)"
else
    echo "  Nanobot Orchestrator: NOT READY"
fi

# Check opencode health
echo "Checking opencode executor..."
if curl -s http://localhost:8001/health > /dev/null; then
    echo "  OpenCode Executor: OK (http://localhost:8001)"
else
    echo "  OpenCode Executor: NOT READY"
fi

echo ""
echo "Services started. Logs: docker-compose logs -f"
