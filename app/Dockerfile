# ============================================
# DASHBOARD - React frontend served by nginx
# ============================================

FROM node:22-slim AS builder

WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci

COPY . ./
RUN npm run build

# Production stage - nginx (non-root)
FROM nginx:alpine

# Create non-root user and fix permissions
RUN adduser -D -u 1000 appuser && \
    mkdir -p /var/cache/nginx/client_temp /var/cache/nginx/proxy_temp /var/cache/nginx/fastcgi_temp /var/cache/nginx/uwsgi_temp /var/cache/nginx/scgi_temp && \
    chown -R appuser:appuser /var/cache/nginx /usr/share/nginx/html /etc/nginx/conf.d /var/log/nginx /run

# Copy built app
COPY --from=builder /build/dist /usr/share/nginx/html

# Nginx config for SPA routing (non-root)
RUN echo 'user appuser; \
worker_processes auto; \
error_log /var/log/nginx/error.log warn; \
pid /run/nginx.pid; \
events { \
    worker_connections 1024; \
} \
http { \
    include /etc/nginx/mime.types; \
    default_type application/octet-stream; \
    sendfile on; \
    keepalive_timeout 65; \
    server { \
        listen 8080; \
        root /usr/share/nginx/html; \
        index index.html; \
        location / { \
            try_files $uri $uri/ /index.html; \
        } \
        location /api/ { \
            proxy_pass http://nanobot-orchestrator:8080/api/; \
            proxy_http_version 1.1; \
            proxy_set_header Host $host; \
            proxy_set_header X-Real-IP $remote_addr; \
        } \
        location /webhook/ { \
            proxy_pass http://nanobot-orchestrator:8080/webhook/; \
            proxy_http_version 1.1; \
            proxy_set_header Host $host; \
            proxy_set_header X-Real-IP $remote_addr; \
        } \
        location /health { \
            proxy_pass http://nanobot-orchestrator:8080/health; \
        } \
    } \
}' > /etc/nginx/nginx.conf

USER appuser

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
