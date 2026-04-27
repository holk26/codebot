# ============================================
# NANOBOT ORCHESTRATOR - DOCKERFILE
# Installs HKUDS/nanobot-ai and custom orchestrator
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
    gettext-base \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages into a virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy requirements
COPY nanobot-orchestrator/requirements.txt /tmp/nanobot-req.txt
COPY opencode-executor/requirements.txt /tmp/opencode-req.txt

# Install nanobot-ai from PyPI + orchestrator dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /tmp/nanobot-req.txt && \
    pip install --no-cache-dir -r /tmp/opencode-req.txt


# --- Production stage ---
FROM python:3.11-slim

ARG APP_USER
ARG APP_UID

# Install runtime dependencies (including gettext for envsubst)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    ca-certificates \
    gettext-base \
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
# /home/appuser/.nanobot is the runtime data directory (mounted as volume)
RUN mkdir -p /app/src /app/config /app/data /app/logs /app/skills /workspace /tmp /home/${APP_USER}/.nanobot/data /home/${APP_USER}/.nanobot/logs && \
    chown -R ${APP_USER}:${APP_USER} /app /workspace /tmp /home/${APP_USER}

# Copy application code
COPY --chown=${APP_USER}:${APP_USER} nanobot-orchestrator/src/ /app/src/
COPY --chown=${APP_USER}:${APP_USER} shared/ /app/shared/
COPY --chown=${APP_USER}:${APP_USER} nanobot-orchestrator/generate_config.py /app/generate_config.py

# Copy entrypoint
COPY --chown=${APP_USER}:${APP_USER} nanobot-orchestrator/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Switch to non-root user
USER ${APP_USER}

# Environment
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV NANOBOT_CONFIG_PATH=/home/appuser/.nanobot/config.json
ENV HOME=/home/appuser

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')"

EXPOSE 8080

ENTRYPOINT ["/app/entrypoint.sh"]
