FROM python:3.11-slim

WORKDIR /app

# Install system dependencies including Node.js for any JS tooling
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    ca-certificates \
    nodejs \
    npm \
    ripgrep \
    fd-find \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir fastapi uvicorn httpx redis pydantic python-dotenv pygithub openai anthropic

# Create directories
RUN mkdir -p /app/src /workspace

# Copy source code
COPY src/ /app/src/

# Set Python path
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

EXPOSE 8001

CMD ["python", "-m", "src.main"]
