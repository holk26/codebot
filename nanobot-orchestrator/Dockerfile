FROM python:3.11-slim

# Create non-root user for security
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

WORKDIR /app

# Install system dependencies and upgrade pip
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir --upgrade pip

# Install Python dependencies as root first (for caching layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create directories and set permissions
RUN mkdir -p /app/src /app/config /workspace \
    && chown -R appuser:appgroup /app /workspace

# Copy source code
COPY --chown=appuser:appgroup src/ /app/src/
COPY --chown=appuser:appgroup config/ /app/config/

# Switch to non-root user
USER appuser

# Set Python path
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

EXPOSE 8080

CMD ["python", "-m", "src.main"]
