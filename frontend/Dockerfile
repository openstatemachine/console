# syntax=docker/dockerfile:1
#
# Build the console UI image. The console depends on the shared @osml/graph-kit
# package (file:../shared), so this image must be built from the REPO ROOT so the
# sibling `shared/` directory is inside the build context:
#
#   docker build -f frontend/Dockerfile -t openstatemachine/console .
#
FROM node:22-bookworm-slim AS build
WORKDIR /app

# Shared workspace package (linked via file:../shared) must exist before install.
COPY shared ./shared

COPY frontend/package.json frontend/package-lock.json ./frontend/
WORKDIR /app/frontend
RUN npm ci

COPY frontend ./

ENV VITE_BASE_PATH=/
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine

# Rendered at container start by the stock nginx entrypoint (envsubst).
COPY --chown=nginx:nginx frontend/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --chown=nginx:nginx --from=build /app/frontend/dist /usr/share/nginx/html

# Same-compose default; override when the engine is on another host/service.
ENV STATUM_API_UPSTREAM=http://engine:8080

EXPOSE 9000

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:9000/ || exit 1
