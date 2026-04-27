# ============================================
# OPENCODE EXECUTOR - HARDENED DOCKERFILE
# ============================================

ARG APP_USER=appuser
ARG APP_UID=1000

# --- Build stage ---
FROM python:3.11-slim AS builder

WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages into a virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY opencode-executor/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt


# --- Production stage ---
FROM python:3.11-slim

ARG APP_USER
ARG APP_UID

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    ca-certificates \
    nodejs \
    npm \
    ripgrep \
    fd-find \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r ${APP_USER} --gid=${APP_UID} && \
    useradd -r -g ${APP_USER} --uid=${APP_UID} ${APP_USER}

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Set working directory
WORKDIR /app

# Create directories with proper ownership
RUN mkdir -p /app/src /workspace /tmp && \
    chown -R ${APP_USER}:${APP_USER} /app /workspace /tmp

# Copy application code
COPY --chown=${APP_USER}:${APP_USER} opencode-executor/src/ /app/src/
COPY --chown=${APP_USER}:${APP_USER} shared/ /app/shared/

# Switch to non-root user
USER ${APP_USER}

# Environment
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/health')"

EXPOSE 8001

CMD ["python", "-m", "src.main"]
