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
run_step bun run test
run_step bun run build
