# ============================================
# DASHBOARD - React frontend served by nginx
# ============================================

FROM node:22-slim AS builder

WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci

COPY . ./
RUN npm run build

# Production stage - nginx
FROM nginx:alpine

# Copy built app
COPY --from=builder /build/dist /usr/share/nginx/html

# Nginx config for SPA routing
RUN echo 'server { \
    listen 80; \
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
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
