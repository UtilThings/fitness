# 002 - [Migración] Colección audit_logs

- **Prioridad:** 2
- **Estado:** Completado
- **Depende de:** Feature 004 (contrato)
- **Fase:** Fase 1

## Objetivo

Existe la colección `audit_logs` legible solo por owners y no escribible desde la API.

## Contexto

No existe ninguna colección de auditoría. `admins` ya existe, por lo que la relación `actor` es válida. Las reglas `RULE_OWNER` se escriben aquí como literal porque las migraciones no cargan `lib/`.

## Alcance

- Crear `api/pb_migrations/1795261100_created_audit_logs.js` con colección base `audit_logs`: `actor` (relation → `admins`, `maxSelect` 1, no requerida, `cascadeDelete: false`), `action` (select `create`/`update`/`delete`/`custom`, requerido), `collection` (text, requerido), `record_id` (text, requerido), `summary` (text), `diff` (json), `created` (autodate al crear).
- Índices: `(collection, record_id)` y `created`.
- Reglas: `listRule` y `viewRule` = `@request.auth.collectionName = "admins" && @request.auth.active = true && @request.auth.role = "owner"`; `createRule`, `updateRule`, `deleteRule` = `null`.
- `down`: eliminar la colección.

## Criterios de aceptación

- [x] La colección aparece en `/_/` con los campos e índices indicados.
- [x] Un owner lista `audit_logs` por API; un coach recibe lista vacía o `403`; nadie crea registros por API (`403`).
- [x] `down` elimina la colección sin error.

## Referencias

- `features/005-api-fundamentos-roles-y-auditoria/spec.md`, sección "Modelo de datos" → `audit_logs`.
- https://pocketbase.io/docs/js-migrations/
- https://pocketbase.io/docs/api-rules-and-filters/

## Fuera de alcance

- Escritura de registros (hook, tarea 008) y lógica de diff (tarea 007).

## Notas de implementación


Verificado con PocketBase 0.40.5 en una base temporal: esquema del panel, índices en SQLite, lectura de una fila por owner, denegación al coach, escrituras rechazadas a usuarios de la aplicación y reversión de la colección.
