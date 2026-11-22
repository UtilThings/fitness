# 001 - [Migración] Colección clients

- **Prioridad:** 1
- **Estado:** Completado
- **Depende de:** Feature 005 (contrato)
- **Fase:** Fase 1: Modelo de datos y reglas

## Objetivo

La colección `clients` existe en PocketBase con sus campos, índices y reglas de API, y queda registrada para auditoría.

## Contexto

No existe la colección `clients`. La última migración en disco es `api/pb_migrations/1795260843_created_admins.js`; las de 005-009 usan timestamps mayores (verifica con `ls` cuál es la última antes de elegir el timestamp). La feature 005 aporta `api/src/lib/audit-config.ts` y la regla base "staff" (`@request.auth.collectionName = "admins" && @request.auth.active = true`). Las migraciones usan `migrate((app) => {...}, (app) => {...})` con `up` y `down`.

## Alcance

- Crear `api/pb_migrations/<timestamp>_created_clients.js` con la colección base `clients` y los campos del spec: `first_name`, `last_name` (required), `email` (email), `phone`, `status` (select `active|paused|inactive`, required, por defecto `active`), `goals`, `notes`, `assessment` (json), `free_class_used` (bool), `joined_on` (date), `emergency_contact`.
- Índices: único parcial `CREATE UNIQUE INDEX idx_clients_email ON clients (email) WHERE email != ''`; `idx_clients_status`, `idx_clients_last_name`, `idx_clients_phone`.
- Reglas: `listRule`, `viewRule`, `createRule`, `updateRule` = staff; `deleteRule` = owner (`... && @request.auth.role = "owner"`).
- Añadir `clients` a `api/src/lib/audit-config.ts`.
- `down` elimina la colección (sin tocar otras).
- Antes de escribir: comprobar en la versión fijada de PocketBase que el índice parcial se acepta en `collection.indexes`.

## Criterios de aceptación

- [x] Al arrancar PocketBase la migración se aplica sin errores y la colección aparece en `/_/` con los campos y reglas indicados.
- [x] Dos clientes sin email se pueden crear; dos con el mismo email se rechazan por el índice.
- [x] Un usuario sin sesión recibe `403`/`404` en `GET /api/collections/clients/records`.
- [x] `down` revierte la migración y un segundo `up` vuelve a funcionar.
- [x] `clients` figura en `audit-config.ts`.

## Referencias

- `features/010-clientes/spec.md`, sección "Fase 1" → tarea 001.
- `api/pb_migrations/1795260843_created_admins.js` (estilo de migración existente).
- https://pocketbase.io/docs/js-migrations/
- https://pocketbase.io/docs/api-rules-and-filters/

## Fuera de alcance

- Validaciones y normalización (tareas 002 y 003).
- Relaciones desde `bookings`, `memberships` y `payments` (011, 013, 014).

## Notas de implementación


Verificado con PocketBase 0.40.5 en una base temporal: índice parcial, unicidad, acceso anónimo 404, esquema y ciclo up/down/up. Una prueba aislada confirmó que app.save no dispara onRecordUpdateRequest. El estado activo por defecto se aplica en el hook de creación porque el campo select no admite un valor por defecto.
