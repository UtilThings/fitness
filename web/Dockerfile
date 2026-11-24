# syntax=docker/dockerfile:1

# ---- Build ----
FROM oven/bun:1 AS build
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

# Las variables PUBLIC_* se incrustan en el HTML al compilar.
ARG PUBLIC_SITE_URL
ARG PUBLIC_API_URL
ARG PUBLIC_API_TIMEOUT_MS=4000
ENV PUBLIC_SITE_URL=$PUBLIC_SITE_URL \
    PUBLIC_API_URL=$PUBLIC_API_URL \
    PUBLIC_API_TIMEOUT_MS=$PUBLIC_API_TIMEOUT_MS
RUN test -n "$PUBLIC_SITE_URL" || (echo "Falta --build-arg PUBLIC_SITE_URL" >&2; exit 1)
RUN bun run build

# ---- Runtime ----
FROM nginx:1-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q --spider http://127.0.0.1/ || exit 1
