# 006 - [Seguridad] Reglas de API por business

- **Prioridad:** 6
- **Estado:** Completado
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

- [x] Con datos en dos business, `GET /api/collections/<c>/records` devuelve solo el business propio y un id del otro responde `404`.
- [x] `PATCH`/`DELETE` sobre un registro ajeno responde `404`.
- [x] Las reglas de rol anteriores (owner/coach/reception) no cambian dentro del propio business.
- [x] Una prueba falla si una colección de `TENANT_COLLECTIONS` carece de la cláusula de business.
- [x] `bun run build:ts` y `bun test` pasan en verde.

## Fuera de alcance

- Hook de asignación de `business` y relaciones cruzadas (007).

## Referencias

- `features/020-multi-tenancy-business/spec.md`, sección "Fase 1: Fundamentos de datos y aislamiento" → tarea 006.
- `api/README.md`, «Roles y reglas»
- https://pocketbase.io/docs/api-rules-and-filters/

## Notas de implementación

Se verificaron las reglas almacenadas de todas las colecciones y las reglas de owner, coach y reception en PocketBase con dos negocios. La lista devolvió registros propios y GET, PATCH y DELETE ajenos devolvieron 404. Las operaciones previamente reservadas al superusuario conservaron sus reglas nulas. Build de hooks y 103 pruebas en verde.
