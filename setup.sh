#!/bin/bash
# Setup script for GitHub AI Agent

set -e

echo "============================================"
echo "GitHub AI Agent - Setup"
echo "============================================"

# Check dependencies
echo "Checking dependencies..."

if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "ERROR: docker-compose is not installed. Please install docker-compose first."
    exit 1
fi

echo "Docker: OK"

# Create environment file
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "Please edit .env and configure your API keys before starting."
else
    echo ".env already exists, skipping..."
fi

# Create workspace directory
mkdir -p workspace

# Build containers
echo "Building containers..."
docker-compose build

echo ""
echo "============================================"
echo "Setup complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "1. Edit .env with your API keys and GitHub configuration"
echo "2. Start the services: docker-compose up -d"
echo "3. Configure GitHub webhook to point to http://your-server:8000/webhook/github"
echo "4. Check logs: docker-compose logs -f"
echo ""
