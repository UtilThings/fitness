# 001 - [Migración] Colección bookings

- **Prioridad:** 1
- **Estado:** Pendiente
- **Depende de:** Feature 009 (contrato), Feature 010 (contrato), Feature 005 (contrato)
- **Fase:** Fase 1: Modelo y reglas puras

## Objetivo

La colección `bookings` existe con sus campos, índices y reglas de staff, queda auditada y se han verificado las capacidades de PocketBase que condicionan los hooks.

## Contexto

`class_sessions` (009) y `clients` (010) existen por contrato, no en disco todavía; verifica con `ls api/pb_migrations` el timestamp más alto antes de elegir el de esta migración. Las migraciones usan `migrate((app) => {...}, (app) => {...})` con `up` y `down`. La regla staff es `@request.auth.collectionName = "admins" && @request.auth.active = true`.

## Alcance

- Verificación previa (documentar el resultado en "Notas de implementación"): `$app.runInTransaction` disponible en JS; `onRecordAfterUpdateSuccess` se dispara en guardados internos (`$app.save`); `e.requestInfo().body` accesible en `onRecordCreateRequest`; versión de goja y fechas.
- Crear `api/pb_migrations/<timestamp>_created_bookings.js` con los campos del spec: `session` y `client` (relaciones requeridas, sin `cascadeDelete`), `status` (select de seis valores, por defecto `booked`), `waitlist_position`, `cancelled_at`, `marked_by`, `source` (select `admin`), `override_note` y `free_class` (bool, por defecto false, solo escribible por el hook).
- Índices: único `(session, client)`; `idx_bookings_session_status`; `idx_bookings_client`.
- Reglas: list/view/create/update = staff; delete = owner.
- Añadir `bookings` a `api/src/lib/audit-config.ts`.
- `down` elimina solo `bookings`.

## Criterios de aceptación

- [ ] La migración se aplica y revierte sin errores; la colección aparece con campos, índices y reglas.
- [ ] Insertar dos reservas del mismo cliente en la misma sesión falla por el índice único.
- [ ] Sin sesión de usuario, la API devuelve `403`/`404`.
- [ ] Las notas de implementación contienen el resultado de la verificación previa.
- [ ] `bookings` figura en `audit-config.ts`.

## Referencias

- `features/011-reservas-y-asistencia/spec.md`, sección "Fase 1" → tarea 001.
- https://pocketbase.io/docs/js-migrations/
- https://pocketbase.io/docs/js-database/#transaction

## Fuera de alcance

- Lógica de cupo y transiciones (002, 003, 004).

## Notas de implementación

