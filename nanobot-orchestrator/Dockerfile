# ============================================
# NANOBOT ORCHESTRATOR - DOCKERFILE
# Installs HKUDS/nanobot-ai, builds React dashboard, and serves all from FastAPI
# ============================================

ARG APP_USER=appuser

# --- Node build stage (Dashboard) ---
FROM node:22-slim AS node-builder

WORKDIR /build/app

# Copy app source
COPY app/package.json app/package-lock.json ./
RUN npm ci

COPY app/ ./
RUN npm run build

# --- Python build stage ---
FROM python:3.11-slim AS py-builder

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

# Install nanobot-ai from PyPI + orchestrator dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /tmp/nanobot-req.txt


# --- Production stage ---
FROM python:3.11-slim

ARG APP_USER

# Install runtime dependencies (including gettext for envsubst)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    ca-certificates \
    gettext-base \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user (auto-assign GID/UID to avoid conflicts)
RUN groupadd -r ${APP_USER} && \
    useradd -r -g ${APP_USER} ${APP_USER}

# Copy virtual environment from builder
COPY --from=py-builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Set working directory
WORKDIR /app

# Create directories with proper ownership
RUN mkdir -p /app/src /app/config /app/data /app/logs /app/skills /app/static /workspace /tmp /home/${APP_USER}/.nanobot/data /home/${APP_USER}/.nanobot/logs && \
    chown -R ${APP_USER}:${APP_USER} /app /workspace /tmp /home/${APP_USER}

# Copy application code
COPY --chown=${APP_USER}:${APP_USER} nanobot-orchestrator/src/ /app/src/
COPY --chown=${APP_USER}:${APP_USER} shared/ /app/shared/
COPY --chown=${APP_USER}:${APP_USER} nanobot-orchestrator/generate_config.py /app/generate_config.py
COPY --chown=${APP_USER}:${APP_USER} nanobot-orchestrator/skills/ /app/skills/
COPY --chown=${APP_USER}:${APP_USER} nanobot-orchestrator/AGENTS.md /app/AGENTS.md

# Copy built dashboard static files
COPY --from=node-builder --chown=${APP_USER}:${APP_USER} /build/app/dist/ /app/static/

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
ENV DASHBOARD_STATIC_DIR=/app/static

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')"

EXPOSE 8080

ENTRYPOINT ["/app/entrypoint.sh"]
