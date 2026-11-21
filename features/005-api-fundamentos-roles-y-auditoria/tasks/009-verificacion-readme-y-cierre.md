# 009 - [Verificación] verify-api.sh, README de api y cierre

- **Prioridad:** 9
- **Estado:** Completado
- **Depende de:** 001, 002, 003, 004, 005, 006, 007, 008
- **Fase:** Fase final

## Objetivo

Existe un único comando que valida `api/` (compilación, pruebas y humo de reglas) y la documentación explica cómo extenderla; la feature queda cerrada.

## Contexto

`scripts/` tiene `verify-app.sh` y `verify-web.sh` con el patrón `run_step`. `api/` no tiene README. `api/pb` es el binario de PocketBase; `pb_data/` es local.

## Alcance

- Crear `scripts/verify-api.sh` (mismo estilo que `verify-app.sh`): `bun install --frozen-lockfile`, `bun run build:ts`, `bun test`; si existe `api/pb`, arrancar una instancia temporal (`--dir` temporal, `--http 127.0.0.1:<puerto libre>`), esperar `/api/health`, comprobar con `curl` que POST anónimo a `admins` devuelve `403` y que `GET audit_logs/records` anónimo devuelve `403` o lista vacía, y detenerla con `trap`. Sin binario, avisar y omitir esa parte.
- Crear `api/README.md`: estructura, `bun run dev`, `build:ts`, `bun test`, `scripts/verify-api.sh`, reglas (`RULE_STAFF`, `RULE_OWNER`, composición, literales en migraciones), cómo auditar una colección nueva, límites de goja y uso de `tz.ts`, convención de migraciones y timestamps.
- Revisar que los criterios de aceptación del spec se cumplan y cambiar el estado de la feature a `Completado`.

## Criterios de aceptación

- [x] `scripts/verify-api.sh` termina en verde.
- [x] `api/README.md` documenta cada punto listado.
- [x] El script no deja procesos ni directorios temporales tras terminar, incluso si falla un paso.
- [x] Todas las tareas 001-008 figuran como `Completado`.

## Referencias

- `features/005-api-fundamentos-roles-y-auditoria/spec.md`, sección "Fase final" → tarea 009.
- `scripts/verify-app.sh` (patrón del script).

## Fuera de alcance

- Verificación de la app (feature 006).

## Notas de implementación


Pasó verify-api.sh con PocketBase 0.40.5 y 18 pruebas Bun. Se comprobó que la instancia y su directorio se limpian tras una ejecución correcta y tras forzar una respuesta HTTP 500. La integración verificó la actualización de una base anterior, los permisos, el actor, el diff y el comportamiento ante un fallo de auditoría. Se añadió una comprobación en los hooks de petición para impedir escrituras HTTP de auditoría incluso a superusuarios, que de otro modo omiten las reglas de colección.
