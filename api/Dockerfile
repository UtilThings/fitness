FROM oven/bun:1.4.3 AS build

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY tsconfig.json ./
COPY src ./src
RUN bun run build:ts

FROM debian:bookworm-slim

ARG TARGETARCH
RUN test "$TARGETARCH" = amd64 || { echo "api/pb requires linux/amd64" >&2; exit 1; }

WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && install -d -o 10001 -g 10001 /app/pb_data

COPY --chmod=755 pb ./pb
COPY --from=build /app/pb_hooks ./pb_hooks
COPY pb_migrations ./pb_migrations

USER 10001:10001
VOLUME ["/app/pb_data"]
EXPOSE 8090

ENTRYPOINT ["/app/pb"]
CMD ["serve", "--http=0.0.0.0:8090", "--dir=/app/pb_data", "--hooksDir=/app/pb_hooks", "--migrationsDir=/app/pb_migrations", "--hooksWatch=false"]
