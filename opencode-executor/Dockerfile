# ============================================
# OPENCODE EXECUTOR - Native OpenCode Server
# ============================================
# Runs the official opencode-ai CLI in serve mode.
# No custom FastAPI wrapper - uses native opencode REST API.
# ============================================

ARG APP_USER=appuser

FROM node:22-slim

ARG APP_USER

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    ca-certificates \
    ripgrep \
    fd-find \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user (auto-assign GID/UID to avoid conflicts)
RUN groupadd -r ${APP_USER} && \
    useradd -r -g ${APP_USER} ${APP_USER}

# Install opencode-ai globally
RUN npm install -g opencode-ai@latest

# Create config and data directories
RUN mkdir -p /home/${APP_USER}/.config/opencode \
    /home/${APP_USER}/.local/share/opencode \
    /workspace \
    /tmp \
    && chown -R ${APP_USER}:${APP_USER} /home/${APP_USER} /workspace /tmp

# Copy entrypoint
COPY --chown=${APP_USER}:${APP_USER} opencode-executor/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Set working directory
WORKDIR /workspace

# Switch to non-root user
USER ${APP_USER}

# Environment
ENV HOME=/home/${APP_USER}
ENV PATH="/usr/local/bin:${PATH}"
ENV PYTHONUNBUFFERED=1

# Health check - opencode native health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -fsS -u "opencode:${OPENCODE_SERVER_PASSWORD}" http://localhost:8001/global/health || exit 1

EXPOSE 8001

ENTRYPOINT ["/app/entrypoint.sh"]
