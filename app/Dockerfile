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

# Remove default nginx config and create dirs
RUN rm -rf /etc/nginx/conf.d /var/cache/nginx && \
    mkdir -p /tmp/nginx/client_temp /tmp/nginx/proxy_temp /tmp/nginx/fastcgi_temp /tmp/nginx/uwsgi_temp /tmp/nginx/scgi_temp /var/log/nginx

# Copy built app and custom nginx config
COPY --from=builder /build/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
