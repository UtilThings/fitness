#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../api"

run_step() {
  printf '\n==> %s\n' "$*"
  "$@"
  printf 'OK %s\n' "$*"
}

stop_pocketbase() {
  if [[ -n "${pb_pid:-}" ]]; then
    kill "$pb_pid" 2>/dev/null || true
    wait "$pb_pid" 2>/dev/null || true
    pb_pid=""
  fi
}

start_pocketbase() {
  local attempt
  ./pb serve --dir "$work_dir/data" --http "127.0.0.1:$port" \
    --migrationsDir "$PWD/pb_migrations" --hooksDir "$PWD/pb_hooks" --hooksWatch=false --automigrate=false \
    >"$work_dir/pocketbase.log" 2>&1 &
  pb_pid=$!

  for ((attempt = 0; attempt < 100; attempt++)); do
    if ! kill -0 "$pb_pid" 2>/dev/null; then
      break
    fi
    if curl --noproxy '*' --fail --silent --max-time 2 "$base_url/api/health" >/dev/null; then
      return 0
    fi
    sleep 0.1
  done
  cat "$work_dir/pocketbase.log" >&2
  printf 'PocketBase no respondió en %s.\n' "$base_url" >&2
  return 1
}

smoke_test() {
  local port base_url code
  port="$(bun -e '
    import { createServer } from "node:net";
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      console.log(server.address().port);
      server.close();
    });
  ')"
  work_dir="$(mktemp -d "${TMPDIR:-/tmp}/jq-verify-api.XXXXXXXX")"
  pb_pid=""

  cleanup() {
    stop_pocketbase
    rm -rf -- "$work_dir"
  }

  trap cleanup EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM

  base_url="http://127.0.0.1:$port"
  start_pocketbase

  code="$(curl --noproxy '*' --silent --show-error --max-time 5 --output "$work_dir/response.json" \
    --write-out '%{http_code}' -X POST -H 'Content-Type: application/json' \
    --data '{}' "$base_url/api/collections/admins/records")"
  if [[ "$code" != 403 ]]; then
    printf 'Alta anónima de admins: se esperaba 403, se recibió %s.\n' "$code" >&2
    return 1
  fi

  code="$(curl --noproxy '*' --silent --show-error --max-time 5 --output "$work_dir/response.json" \
    --write-out '%{http_code}' "$base_url/api/collections/audit_logs/records")"
  case "$code" in
    403) ;;
    200)
      bun -e '
        const body = await Bun.file(process.argv[1]).json();
        if (!Array.isArray(body?.items) || body.items.length !== 0 || body.totalItems !== 0) {
          throw new Error("Se esperaba una lista de auditoría vacía.");
        }
      ' "$work_dir/response.json"
      ;;
    *)
      printf 'Lectura anónima de audit_logs: se recibió HTTP %s.\n' "$code" >&2
      return 1
      ;;
  esac

  local password
  password="$(bun -e 'console.log(crypto.randomUUID())')"
  ./pb superuser create catalog-verify@example.test "$password" --dir "$work_dir/data" \
    --migrationsDir "$PWD/pb_migrations" --hooksDir "$PWD/pb_hooks" --hooksWatch=false

  JQ_VERIFY_PASSWORD="$password" bun ../scripts/verify-catalog.ts "$base_url" seed
  stop_pocketbase
  start_pocketbase
  JQ_VERIFY_PASSWORD="$password" bun ../scripts/verify-catalog.ts "$base_url" restart
  JQ_VERIFY_PASSWORD="$password" bun ../scripts/verify-schedule.ts "$base_url"
  JQ_VERIFY_PASSWORD="$password" bun ../scripts/verify-bookings.ts "$base_url"
}

run_step bun install --frozen-lockfile
run_step bun run build:ts
run_step bun test

if [[ -f ./pb ]]; then
  (run_step smoke_test)
else
  printf '\nSe omitieron las pruebas de humo porque falta el binario api/pb.\n'
fi
