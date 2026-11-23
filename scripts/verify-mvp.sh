#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."

run_step() {
  printf '\n==> %s\n' "$*"
  "$@"
  printf 'OK %s\n' "$*"
}

check_migrations() {
  shopt -s nullglob
  local collection
  local -a migrations
  for collection in audit_logs services plans class_templates class_sessions schedule_blocks clients bookings; do
    migrations=(api/pb_migrations/*_created_"$collection".js)
    if (( ${#migrations[@]} == 0 )); then
      printf 'Falta la migración de %s.\n' "$collection" >&2
      return 1
    fi
  done
}

check_hooks() {
  local hook
  for hook in bookings dashboard clients; do
    if [[ ! -s "api/pb_hooks/$hook.pb.js" ]]; then
      printf 'Falta el hook compilado de %s.\n' "$hook" >&2
      return 1
    fi
  done

  local result=0
  grep -Rinw -- businesses api/src api/pb_migrations api/pb_hooks || result=$?
  if (( result != 1 )); then
    printf 'La búsqueda de referencias a la colección de ejemplo falló o encontró coincidencias.\n' >&2
    return 1
  fi
}

if [[ ! -x api/pb ]]; then
  printf 'Se necesita el binario ejecutable api/pb para verificar la API con migraciones aplicadas.\n' >&2
  exit 1
fi

run_step check_migrations
run_step scripts/verify-api.sh
run_step check_hooks
run_step scripts/verify-app.sh
