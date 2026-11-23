# 001 - [Migración] Colecciones `coaching_programs` y `coaching_checkins`

- **Prioridad:** 1
- **Estado:** Completado
- **Depende de:** Feature 010 (contrato), Feature 013 (contrato)
- **Fase:** Fase 1: Modelo de datos

## Objetivo

Las colecciones `coaching_programs` y `coaching_checkins` existen con índices y reglas que limitan la escritura de check-ins al coach del programa.

## Contexto

`clients` (010), `memberships` (013) y `admins` se referencian por contrato. El servicio online sigue el servicio publicado en `web/src/pages/online-coaching.astro` (programas de 8-16 semanas). Migraciones en `api/pb_migrations/` con timestamp mayor que el de la última presente; regla staff: `@request.auth.collectionName = "admins" && @request.auth.active = true`.

## Alcance

- Verificar cómo 008 modela el plan online y que 013 admite membresías sin reservas; anotarlo en notas.
- Crear `api/pb_migrations/<timestamp>_created_coaching_programs.js` con los campos del spec (incluido `duration_weeks` 8/12/16), índices `(status, renews_on)`, `(coach, status)`, `(client)` y único parcial `(client)` con `status IN ('active','paused')`; reglas de lista/vista staff, crear/editar owner/reception/coach propio, borrar owner.
- Crear `api/pb_migrations/<timestamp+1>_created_coaching_checkins.js`: campos, índice `(program, checked_at)`, `adherence` entero 1-5 (min/max), reglas con `program.coach = @request.auth.id`.
- `down` elimina primero `coaching_checkins` y luego `coaching_programs`.

## Criterios de aceptación

- [x] `up` y `down` funcionan y `up` es repetible tras `down`.
- [x] Dos programas `active` del mismo cliente fallan; uno `ended` más uno `active` se permite.
- [x] Un check-in con `adherence = 6` o `0` es rechazado.
- [x] Un coach distinto al del programa recibe `403`/`400` al crear check-in; reception puede listar pero no crear.
- [x] `scripts/verify-api.sh` pasa.

## Referencias

- `features/016-online-coaching/spec.md`, "Modelo de datos" y "Fase 1" → tarea 001.
- `web/src/pages/online-coaching.astro`.
- https://pocketbase.io/docs/js-migrations/

## Fuera de alcance

- Lógica y hooks (002, 003).

## Notas de implementación

El catálogo de 008 permite servicios con kind = online y planes per_4_weeks configurados con 2, 3 o 4 periodos (8, 12 o 16 semanas). El seed actual no incluye planes online. La ruta de asignación de 013 acepta estos planes sin crear reservas ni movimientos si el plan tiene cero sesiones. Se verificó con un plan online de tres periodos y el ciclo up/down/up en una base temporal.
