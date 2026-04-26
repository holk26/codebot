FROM python:3.11-slim

# Create non-root user for security
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

WORKDIR /app

# Install system dependencies including Node.js for any JS tooling and upgrade pip
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    ca-certificates \
    nodejs \
    npm \
    ripgrep \
    fd-find \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir --upgrade pip

# Install Python dependencies as root first (for caching layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create directories and set permissions
RUN mkdir -p /app/src /workspace \
    && chown -R appuser:appgroup /app /workspace

# Copy source code
COPY --chown=appuser:appgroup src/ /app/src/

# Switch to non-root user
USER appuser

# Set Python path
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

EXPOSE 8001

CMD ["python", "-m", "src.main"]
