# 001 - [Migración] Colecciones `memberships` y `credit_movements`

- **Prioridad:** 1
- **Estado:** Completado
- **Depende de:** Feature 008 (contrato), Feature 010 (contrato), Feature 011 (contrato)
- **Fase:** Fase 1: Modelo de datos

## Objetivo

Las colecciones `memberships` y `credit_movements` existen con campos, índices y reglas cerradas, y se pueden revertir.

## Contexto

`api/pb_migrations/` contiene migraciones JS (`migrate((app) => {...}, (app) => {...})`); la última conocida es `1795260843_created_admins.js` y las features 005-012 añaden más, así que el timestamp debe ser mayor que el de la última presente. Las colecciones `clients`, `plans` y `bookings` se referencian por contrato (010, 008, 011). Reglas por defecto `null`; regla staff: `@request.auth.collectionName = "admins" && @request.auth.active = true`.

## Alcance

- Crear `api/pb_migrations/<timestamp>_created_memberships.js` con los campos del spec (incluidos `paused_at`, `notes` y `ended_on`, fecha de baja `YYYY-MM-DD` opcional), índices `(client, status)`, `(current_period_end)` y único parcial `(client, plan)` donde `status IN ('active','paused')`; `listRule`/`viewRule` = staff, resto `null`.
- Crear `api/pb_migrations/<timestamp+1>_created_credit_movements.js` con `membership` (obligatorio), `booking`, `delta`, `reason`, `note`, `created_by`, autodate `created`, índices `(membership, created)` y `(booking)`; `listRule`/`viewRule` = staff, escritura `null`.
- `down` elimina primero `credit_movements` y luego `memberships`.
- Antes de modificar: comprobar en la versión instalada de PocketBase que los filtros por back-relation (`memberships_via_client.status`) y `$app.runInTransaction` funcionan; anotar el resultado en "Notas de implementación".
- Fuera: lógica, hooks y UI.

## Criterios de aceptación

- [x] Con una base limpia, `up` crea ambas colecciones con campos, índices y reglas indicados.
- [x] `down` las elimina sin error y `up` puede volver a ejecutarse.
- [x] Una petición de creación vía API REST con sesión admin devuelve `403` (regla `null`).
- [x] Crear dos membresías `active` del mismo cliente y plan falla por el índice único.
- [x] `scripts/verify-api.sh` pasa en verde.

## Referencias

- `features/013-membresias-y-creditos/spec.md`, sección "Fase 1" → tarea 001.
- https://pocketbase.io/docs/js-migrations/

## Fuera de alcance

- Reglas de negocio y rutas (tareas 002-005); expiración (006).

## Notas de implementación

PocketBase 0.40.5 ejecutó una transacción en goja y resolvió el filtro inverso memberships_via_client.status antes de aplicar la migración. También se verificó up → down 2 → up en una base temporal.
