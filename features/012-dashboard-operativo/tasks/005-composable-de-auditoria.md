# 005 - [Composable] Lib y composable de consulta de auditoría

- **Prioridad:** 5
- **Estado:** Pendiente
- **Depende de:** Feature 005 (contrato)
- **Fase:** Fase 3: Auditoría

## Objetivo

La app puede consultar `audit_logs` con paginación y filtros por colección, actor y rango de fechas.

## Contexto

`audit_logs` (feature 005) tiene `actor` (relación a `admins`), `action`, `collection`, `record_id`, `summary`, `diff` y `created`; `listRule`/`viewRule` solo para owner. Los filtros usan la sintaxis de PocketBase (`pb.filter` con parámetros para evitar inyección).

## Alcance

- `app/src/lib/audit.ts`: `ACTION_LABELS` (Creación, Edición, Eliminación, Acción), `COLLECTION_LABELS` (nombres en español de las colecciones auditadas), `buildAuditFilter({ collection, actor, from, to })` (las fechas locales del filtro se convierten a UTC con `lib/datetime.ts`), `formatDiff(diff)` → lista de `{ field, before, after }`.
- `app/src/composables/useAuditLogs.ts`: `items`, `page`, `totalPages`, `filters`, `load()`, `setFilters()`; orden `-created`, `expand=actor`, 25 por página; lista de actores para el filtro (`admins`).
- Pruebas Vitest de `buildAuditFilter` (filtros vacíos, uno, combinados, conversión de fechas) y `formatDiff` (campos añadidos, cambiados, eliminados, valores largos).

## Criterios de aceptación

- [ ] `buildAuditFilter` con todos los filtros genera una expresión con parámetros (sin interpolar valores del usuario).
- [ ] `formatDiff` representa creación, cambio y eliminación de campos.
- [ ] `useAuditLogs` pagina y recarga al cambiar filtros reiniciando a la página 1.
- [ ] `typecheck`, `lint`, `format:check` y `test` pasan.

## Referencias

- `features/012-dashboard-operativo/spec.md`, sección "Fase 3" → tarea 005.
- https://pocketbase.io/docs/api-rules-and-filters/

## Fuera de alcance

- Vista y ruta (006); exportación de la auditoría.

## Notas de implementación

