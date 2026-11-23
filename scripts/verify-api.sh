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
  MESSAGES_REMINDER_HOURS=24 MESSAGES_DUE_DAYS_BEFORE=3 MESSAGES_RENEWAL_DAYS_BEFORE=5 STUDIO_NAME="JQ Fitness" \
    PUBLIC_SITE_ORIGINS="https://fitness.example.test" PUBLIC_SCHEDULE_MAX_WEEKS=8 PUBLIC_CATALOG_CACHE_SECONDS=30 \
    ./pb serve --dev --dir "$work_dir/data" --http "127.0.0.1:$port" \
    --migrationsDir "$PWD/pb_migrations" --hooksDir "$work_dir/hooks" --hooksWatch=false --automigrate=false \
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
  cp -r "$PWD/pb_hooks" "$work_dir/hooks"
  # Inyecta un reloj únicamente en la instancia temporal de verificación.
  cat >"$work_dir/hooks/verify-message-clock.pb.js" <<'JS'
routerAdd("POST", "/api/verify/messages/daily", (e) => {
  const { sendDatedNotices } = require(`${__hooks}/lib/message-triggers`);
  const { instant } = e.requestInfo().body;
  sendDatedNotices(e.app, "payment_due", new Date(instant));
  sendDatedNotices(e.app, "membership_renewal", new Date(instant));
  return e.json(200, {});
}, $apis.requireSuperuserAuth());
JS

  local migration
  local payments_migration="1795264801_created_payments.js"
  mkdir "$work_dir/payment-migrations" "$work_dir/agenda-migrations" "$work_dir/coaching-migrations"
  for migration in "$PWD/pb_migrations/"*.js; do
    if [[ ! "${migration##*/}" > "$payments_migration" ]]; then
      ln -s "$migration" "$work_dir/payment-migrations/"
    fi
    if [[ ! "${migration##*/}" > "1795264901_added_title_to_class_sessions.js" ]]; then
      ln -s "$migration" "$work_dir/agenda-migrations/"
    fi
    if [[ ! "${migration##*/}" > "1795265001_created_coaching_checkins.js" ]]; then
      ln -s "$migration" "$work_dir/coaching-migrations/"
    fi
  done
  local -a migration_flags=(--dir "$work_dir/data" --migrationsDir "$work_dir/payment-migrations" --hooksDir "$PWD/pb_hooks")
  check_payment_collections() {
    bun -e '
      import { Database } from "bun:sqlite";
      const db = new Database(process.argv[1], { readonly: true });
      const row = db.query("SELECT count(*) AS total FROM _collections WHERE name IN (?, ?)").get("payments", "receipt_sequences");
      if (row.total !== Number(process.argv[2])) throw new Error("Migración de pagos incompleta");
    ' "$work_dir/data/data.db" "$1"
  }
  ./pb migrate up "${migration_flags[@]}"
  check_payment_collections 2
  printf 'y\n' | ./pb migrate down 2 "${migration_flags[@]}"
  check_payment_collections 0
  ./pb migrate up "${migration_flags[@]}"
  check_payment_collections 2
  bun -e '
    import { Database } from "bun:sqlite";
    const db = new Database(process.argv[1]);
    db.query("INSERT INTO class_sessions (id, service, starts_at, duration_min, capacity, status, kind, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run("preagenda000001", "cat008service00", "2026-01-01 15:00:00.000Z", 60, 6, "scheduled", "regular", "Sesión anterior a la migración");
  ' "$work_dir/data/data.db"
  local -a agenda_migration_flags=(--dir "$work_dir/data" --migrationsDir "$work_dir/agenda-migrations" --hooksDir "$PWD/pb_hooks")
  check_agenda_schema() {
    bun -e '
      import { Database } from "bun:sqlite";
      const db = new Database(process.argv[1], { readonly: true });
      const availability = db.query("SELECT name FROM sqlite_master WHERE type = ? AND name = ?").get("table", "coach_availability");
      const title = db.query("PRAGMA table_info(class_sessions)").all().some((column) => column.name === "title");
      const row = db.query("SELECT * FROM class_sessions WHERE id = ?").get("preagenda000001");
      const expected = process.argv[2] === "yes";
      if (row?.kind !== "regular" || row?.notes !== "Sesión anterior a la migración" || (expected && row.title !== "")) {
        throw new Error("Se alteró la sesión anterior a la migración de agenda");
      }
      if (Boolean(availability) !== expected || title !== expected) throw new Error("Migración de agenda incompleta");
    ' "$work_dir/data/data.db" "$1"
  }
  ./pb migrate up "${agenda_migration_flags[@]}"
  check_agenda_schema yes
  printf 'y\n' | ./pb migrate down 2 "${agenda_migration_flags[@]}"
  check_agenda_schema no
  ./pb migrate up "${agenda_migration_flags[@]}"
  check_agenda_schema yes
  bun -e '
    import { Database } from "bun:sqlite";
    const db = new Database(process.argv[1]);
    db.query("DELETE FROM class_sessions WHERE id = ?").run("preagenda000001");
  ' "$work_dir/data/data.db"
  local -a coaching_migration_flags=(--dir "$work_dir/data" --migrationsDir "$work_dir/coaching-migrations" --hooksDir "$PWD/pb_hooks")
  check_coaching_collections() {
    bun -e '
      import { Database } from "bun:sqlite";
      const db = new Database(process.argv[1], { readonly: true });
      const row = db.query("SELECT count(*) AS total FROM _collections WHERE name IN (?, ?)").get("coaching_programs", "coaching_checkins");
      if (row.total !== Number(process.argv[2])) throw new Error("Migración de coaching incompleta");
    ' "$work_dir/data/data.db" "$1"
  }
  ./pb migrate up "${coaching_migration_flags[@]}"
  check_coaching_collections 2
  printf 'y\n' | ./pb migrate down 2 "${coaching_migration_flags[@]}"
  check_coaching_collections 0
  ./pb migrate up "${coaching_migration_flags[@]}"
  check_coaching_collections 2
  ./pb migrate up --dir "$work_dir/data" --migrationsDir "$PWD/pb_migrations" --hooksDir "$PWD/pb_hooks"
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
  JQ_VERIFY_DB="$work_dir/data/data.db" JQ_VERIFY_PASSWORD="$password" bun ../scripts/verify-memberships.ts "$base_url"
  JQ_VERIFY_DB="$work_dir/data/data.db" JQ_VERIFY_PASSWORD="$password" bun ../scripts/verify-payments.ts "$base_url"
  JQ_VERIFY_DB="$work_dir/data/data.db" JQ_VERIFY_PASSWORD="$password" bun ../scripts/verify-coaching.ts "$base_url"
  JQ_VERIFY_DB="$work_dir/data/data.db" JQ_VERIFY_PASSWORD="$password" bun ../scripts/verify-reports.ts "$base_url"
  JQ_VERIFY_DB="$work_dir/data/data.db" JQ_VERIFY_PASSWORD="$password" bun ../scripts/verify-messages.ts "$base_url"
  bun ../scripts/verify-public.ts "$base_url" "$work_dir/data/data.db" "$work_dir/pocketbase.log"
}

run_step bun install --frozen-lockfile
run_step bun run build:ts
run_step bun test

if [[ -f ./pb ]]; then
  (run_step smoke_test)
else
  printf '\nSe omitieron las pruebas de humo porque falta el binario api/pb.\n'
fi
