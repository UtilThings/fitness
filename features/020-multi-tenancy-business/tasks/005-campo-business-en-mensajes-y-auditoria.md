# 005 - [Migración] Campo `business` en mensajes y auditoría

- **Prioridad:** 5
- **Estado:** Completado
- **Depende de:** 004
- **Fase:** Fase 1: Fundamentos de datos y aislamiento

## Objetivo

`message_templates`, `message_logs` y `audit_logs` pertenecen a un business, y un business nuevo recibe sus plantillas de mensajes por defecto.

## Contexto

`message_templates` (018) tiene único `(key, locale)` y está sembrada por `1795265103_seeded_message_templates.js`. `audit_logs` (005) solo la escribe el servidor; hoy no registra tenant.

## Alcance

- Migración `1795266300_added_business_to_messages_and_audit.js` con el patrón de 003; `message_templates` único `(business, key, locale)`.
- Extraer la semilla de plantillas a `api/src/lib/business-defaults.ts` (`seedBusinessDefaults(app, businessId)`, idempotente) y llamarla desde `onRecordCreate` de `businesses` en `api/src/hooks/businesses.ts`.
- Completar `TENANT_COLLECTIONS` (lista final de 17 colecciones + `admins`).
- Pruebas: la semilla crea las plantillas una vez por business y no duplica.

## Criterios de aceptación

- [x] Plantillas, logs y auditoría existentes quedan en el business por defecto.
- [x] Crear un business desde /_/ crea sus plantillas por defecto; repetir no duplica.
- [x] `TENANT_COLLECTIONS` coincide con todas las colecciones de dominio (prueba en verde).
- [x] `bun run build:ts` y `bun test` pasan en verde.

## Fuera de alcance

- El hook que asigna `business` al escribir auditoría (008).

## Referencias

- `features/020-multi-tenancy-business/spec.md`, sección "Fase 1: Fundamentos de datos y aislamiento" → tarea 005.
- `api/pb_migrations/1795265100_created_message_templates.js`
- `api/pb_migrations/1795265103_seeded_message_templates.js`

## Notas de implementación

La migración se verificó con registros existentes en las tres colecciones. El alta via REST como superusuario, igual a la que usa `/_/`, sembró 12 plantillas en una transacción. La repetición del alta conservó ambos conjuntos sin duplicados. La prueba de `TENANT_COLLECTIONS` cubre las 18 relaciones y pasaron el build y las 102 pruebas.
