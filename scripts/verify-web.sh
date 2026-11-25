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
run_step bun run i18n:check
site_url="${PUBLIC_SITE_URL:-https://fitness.example.test}"
run_step env PUBLIC_SITE_URL="$site_url" PUBLIC_API_URL= PUBLIC_BUSINESS_KEY= bun run test
run_step env PUBLIC_SITE_URL="$site_url" PUBLIC_API_URL= PUBLIC_BUSINESS_KEY= bun run build
run_step bun run test:dist
run_step bun run test:build:offline

check_no_lovable() {
  local status=0
  rg -ail --hidden 'lovable' dist || status=$?
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
