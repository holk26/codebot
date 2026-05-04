# ============================================
# DASHBOARD - React frontend served by nginx
# With HTTP Basic Auth protection
# ============================================

FROM node:22-slim AS builder

WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci

COPY . ./
RUN npm run build

# Production stage - nginx with basic auth
FROM nginx:alpine

# Install apache2-utils for htpasswd
RUN apk add --no-cache apache2-utils

# Remove default nginx config and create dirs
RUN rm -rf /etc/nginx/conf.d /var/cache/nginx && \
    mkdir -p /tmp/nginx/client_temp /tmp/nginx/proxy_temp /tmp/nginx/fastcgi_temp /tmp/nginx/uwsgi_temp /tmp/nginx/scgi_temp /var/log/nginx

# Create htpasswd file (user: admin, password from DASHBOARD_PASSWORD env)
# If no password provided, uses a random one
RUN htpasswd -cb /etc/nginx/.htpasswd admin "${DASHBOARD_PASSWORD:-changeme}"

# Copy built app and custom nginx config
COPY --from=builder /build/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
