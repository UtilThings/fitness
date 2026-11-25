#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../app"

run_step() {
  printf '\n==> %s\n' "$*"
  "$@"
  printf 'OK %s\n' "$*"
}

run_step bun install --frozen-lockfile
run_step bun run lint
run_step bun run format:check
run_step bun run typecheck
run_step bun run i18n:check --api --spanish-literals
run_step bun run test
run_step env VITE_POCKETBASE_URL="${VITE_POCKETBASE_URL:-http://127.0.0.1:8090}" \
  VITE_APP_NAME="${VITE_APP_NAME:-Admin}" bun run build
