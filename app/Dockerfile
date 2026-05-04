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

# Remove default nginx config
RUN rm -f /etc/nginx/conf.d/default.conf

# Create non-root user and fix permissions
RUN adduser -D -u 1000 appuser && \
    mkdir -p /tmp/nginx/client_temp /tmp/nginx/proxy_temp /tmp/nginx/fastcgi_temp /tmp/nginx/uwsgi_temp /tmp/nginx/scgi_temp && \
    chown -R appuser:appuser /tmp/nginx /usr/share/nginx/html /var/log/nginx /run /etc/nginx/conf.d

# Copy built app
COPY --from=builder /build/dist /usr/share/nginx/html
COPY --chown=appuser:appuser nginx.conf /etc/nginx/nginx.conf

USER appuser

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
