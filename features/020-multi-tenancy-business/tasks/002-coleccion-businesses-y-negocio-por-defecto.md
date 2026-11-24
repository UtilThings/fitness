# 002 - [Migración] Colección `businesses` y business por defecto

- **Prioridad:** 2
- **Estado:** Pendiente
- **Depende de:** 001
- **Fase:** Fase 1: Fundamentos de datos y aislamiento

## Objetivo

Existe la colección `businesses` con su modelo y reglas, y un business por defecto («JQ Fitness») listo para recibir los datos actuales.

## Contexto

Ninguna colección de tenant existe. La última migración es `1795265103_seeded_message_templates.js`. Los valores actuales viven en `STUDIO_NAME`, `STUDIO_PHONE`, `America/New_York`, `USD` y el prefijo `JQ` de `receipt-number.ts`. Se sigue el estilo de `1795263000_created_services.js` (`new Collection`, `up`/`down`).

## Alcance

- Crear `api/pb_migrations/1795266000_created_businesses.js` con los campos, índices y reglas del spec (`create`/`delete` en `null`; `list`/`view` staff del propio business; `update` owner del propio business).
- Crear `1795266001_seeded_default_business.js`: inserta el business por defecto una sola vez (idempotente por `slug = 'jq-fitness'`), usando `STUDIO_NAME`/`STUDIO_PHONE` si existen, `timezone = America/New_York`, `currency = USD`, `receipt_prefix = JQ`, `active = true`, `allowed_origins` tomado de `PUBLIC_SITE_ORIGINS`.
- Validar `timezone` (zona conocida) y `allowed_origins` (formato, máx. 10, sin `*`) en un hook `onRecordCreate/UpdateRequest` en `api/src/hooks/businesses.ts` con lógica pura en `api/src/lib/business.ts`.
- Añadir `businesses` a `AUDITED_COLLECTIONS` y `public_key_hash` a `SENSITIVE_FIELDS`.
- Pruebas: `api/src/lib/business.test.ts` (zonas válidas/ inválidas, orígenes válidos/ con comodín/ repetidos/ más de 10).

## Criterios de aceptación

- [ ] Tras migrar una base vacía y una con datos hay exactamente un business por defecto; un segundo arranque no lo duplica.
- [ ] Un owner no puede crear ni borrar business; solo edita los campos permitidos del suyo (el resto se rechaza).
- [ ] `timezone` inválida y orígenes con `*` se rechazan con `400`.
- [ ] `public_key_hash` no aparece en respuestas de la API ni en el diff de auditoría.
- [ ] `bun run build:ts` y `bun test` pasan en verde; `down` revierte la migración.

## Fuera de alcance

- Campo `business` en otras colecciones (003-005).
- Clave pública y su ruta (014).

## Referencias

- `features/020-multi-tenancy-business/spec.md`, sección "Fase 1: Fundamentos de datos y aislamiento" → tarea 002.
- `api/pb_migrations/1795263000_created_services.js`
- `api/src/lib/audit-config.ts`
- https://pocketbase.io/docs/js-migrations/

## Notas de implementación

<!-- Vacío al crear la tarea. Al completarla, registra archivos creados/modificados, decisiones, desviaciones y hallazgos pendientes. -->
