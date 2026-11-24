# 006 - [Seguridad] Reglas de API por business

- **Prioridad:** 6
- **Estado:** Pendiente
- **Depende de:** 003, 004, 005
- **Fase:** Fase 1: Fundamentos de datos y aislamiento

## Objetivo

Ninguna colección de dominio puede listarse, leerse, editarse ni borrarse fuera del business del usuario autenticado.

## Contexto

`api/src/lib/rules.ts` define `RULE_STAFF`, `RULE_OWNER`, `ruleAnd`, `ruleOr`, `ruleRoles` y `ruleOwnerOrSelf`. Las migraciones guardan las reglas como literales generados con esos compositores y las pruebas comparan literales y librería (ver `api/README.md`, «Roles y reglas»).

## Alcance

- Agregar a `rules.ts`: `RULE_BUSINESS = '@request.auth.business = business'` y `ruleBusiness(rule)` que lo combina con `ruleAnd`; `RULE_BUSINESS_SELF` para `businesses` (`@request.auth.business = id`).
- Migración `1795266400_scoped_rules_by_business.js` que reescribe `list/view/update/delete` de `admins`, las 17 colecciones y `businesses`; `create` conserva el rol exigido (el business lo fija 007).
- Conservar las reglas especiales existentes (`ruleOwnerOrSelf` en `admins`, lectura de `audit_logs` solo owners).
- Pruebas `rules.test.ts` actualizadas: cada literal de la migración coincide con la librería y toda regla de `TENANT_COLLECTIONS` incluye la cláusula de business.

## Criterios de aceptación

- [ ] Con datos en dos business, `GET /api/collections/<c>/records` devuelve solo el business propio y un id del otro responde `404`.
- [ ] `PATCH`/`DELETE` sobre un registro ajeno responde `404`.
- [ ] Las reglas de rol anteriores (owner/coach/reception) no cambian dentro del propio business.
- [ ] Una prueba falla si una colección de `TENANT_COLLECTIONS` carece de la cláusula de business.
- [ ] `bun run build:ts` y `bun test` pasan en verde.

## Fuera de alcance

- Hook de asignación de `business` y relaciones cruzadas (007).

## Referencias

- `features/020-multi-tenancy-business/spec.md`, sección "Fase 1: Fundamentos de datos y aislamiento" → tarea 006.
- `api/README.md`, «Roles y reglas»
- https://pocketbase.io/docs/api-rules-and-filters/

## Notas de implementación

<!-- Vacío al crear la tarea. Al completarla, registra archivos creados/modificados, decisiones, desviaciones y hallazgos pendientes. -->
