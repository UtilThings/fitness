# 001 - [Migración] Colecciones `payments` y `receipt_sequences`

- **Prioridad:** 1
- **Estado:** Completado
- **Depende de:** Feature 013 (contrato)
- **Fase:** Fase 1: Modelo de datos

## Objetivo

`payments` y `receipt_sequences` existen con índices únicos que impiden duplicar recibos o cobros de ciclo, y con reglas que ocultan los pagos al coach.

## Contexto

`memberships` (013), `plans` (008), `clients` (010) y `admins` se referencian por contrato. Las migraciones viven en `api/pb_migrations/` (`migrate((app) => {...}, (app) => {...})`); el timestamp debe ser mayor que el de la última presente. Regla de pagos: staff con `@request.auth.role != "coach"`.

## Alcance

- Crear `api/pb_migrations/<timestamp>_created_receipt_sequences.js`: `year` (único), `last_seq`; todas las reglas `null`.
- Crear `api/pb_migrations/<timestamp+1>_created_payments.js` con los campos del spec (incluidos `period_index`, `void_reason`, `voided_at`, `voided_by`), índices únicos parciales (`receipt_number != ''`; `(membership, period_index)` con `membership != '' AND status != 'void'`) e índices de consulta; `listRule`/`viewRule` = staff sin coach; escritura `null`.
- `down` elimina ambas colecciones.
- Comprobar antes que `runInTransaction` serializa escrituras y que los índices parciales funcionan; registrar el resultado en notas.

## Criterios de aceptación

- [x] `up` crea ambas colecciones y `down` las revierte sin error.
- [x] Insertar dos pagos con el mismo `receipt_number` falla; varios con `receipt_number` vacío se permiten.
- [x] Insertar dos pagos no anulados con la misma `(membership, period_index)` falla; si el primero está `void`, el segundo se permite.
- [x] Un coach autenticado recibe lista vacía o `403` al listar `payments`; una creación REST devuelve `403`.
- [x] `scripts/verify-api.sh` pasa.

## Referencias

- `features/014-pagos-y-recibos/spec.md`, "Modelo de datos" y "Fase 1" → tarea 001.
- https://pocketbase.io/docs/js-migrations/

## Fuera de alcance

- Numeración y rutas (002, 004); generación de cobros (005).

## Notas de implementación

PocketBase 0.40.5 serializó 24 incrementos concurrentes del mismo contador y devolvió todos los valores del 1 al 24. La verificación de API aplicó y revirtió las dos migraciones en una base temporal, comprobó los índices parciales y confirmó los permisos de coach y staff.
