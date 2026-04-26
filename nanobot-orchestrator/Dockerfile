FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install nanobot from PyPI
RUN pip install --no-cache-dir nanobot-ai fastapi uvicorn httpx redis pydantic python-dotenv pygithub

# Create directories
RUN mkdir -p /app/src /app/config /workspace

# Copy source code
COPY src/ /app/src/
COPY config/ /app/config/

# Set Python path
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["python", "-m", "src.main"]
