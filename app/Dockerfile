# syntax=docker/dockerfile:1

# Usa la raíz del repositorio como contexto para incluir los módulos compartidos.
FROM oven/bun:1.4.3 AS build
WORKDIR /workspace/app

COPY app/package.json app/bun.lock ./
RUN bun install --frozen-lockfile

COPY app/ ./
COPY api/src/lib/ /workspace/api/src/lib/

# Vite incorpora estas variables públicas al compilar.
ARG VITE_POCKETBASE_URL
ARG VITE_APP_NAME
ARG VITE_PRIMEVUE_LICENSE
RUN test -n "$VITE_POCKETBASE_URL" || { echo "Falta --build-arg VITE_POCKETBASE_URL" >&2; exit 1; }
RUN bun run build

FROM nginx:1-alpine AS runtime
COPY app/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q --spider http://127.0.0.1/ || exit 1
