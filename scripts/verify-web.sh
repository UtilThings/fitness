#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../web"

run_step() {
  printf '\n==> %s\n' "$*"
  "$@"
  printf 'OK %s\n' "$*"
}

run_step bun install --frozen-lockfile
run_step bun run lint
run_step bun run format:check
run_step bun run check
run_step bun run test
run_step bun run build
run_step bun run test:dist

check_no_lovable() {
  local status=0
  grep -rail 'lovable' dist || status=$?
  case "$status" in
    1) return 0 ;;
    0)
      printf 'La compilación contiene referencias a Lovable.\n' >&2
      return 1
      ;;
    *) return "$status" ;;
  esac
}

run_step check_no_lovable
