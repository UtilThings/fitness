# 004 - [Lib] Librería de reglas y roles

- **Prioridad:** 4
- **Estado:** Completado
- **Depende de:** 003
- **Fase:** Fase 1

## Objetivo

Existe `api/src/lib/rules.ts` con las reglas base y compositores para que cada feature declare reglas de API sin copiar strings.

## Contexto

Contrato: regla "staff" = `@request.auth.collectionName = "admins" && @request.auth.active = true`; "owner" = staff + `@request.auth.role = "owner"`; roles `owner`, `coach`, `reception`. Las migraciones no pueden importar `lib/`, así que esta librería sirve a `routerAdd`, a pruebas y a generar los literales que se pegan en migraciones.

## Alcance

- Crear `api/src/lib/rules.ts` con `ROLES`, tipo `Role`, `RULE_STAFF`, `RULE_OWNER`, `ruleAnd(...partes)`, `ruleOr(...partes)` (envuelven en paréntesis cada parte compuesta y omiten vacías), `ruleRoles(...roles)` (staff + `(@request.auth.role = "a" || @request.auth.role = "b")`, valida contra `ROLES`) y `ruleOwnerOrSelf(lockedFields = [])` (owner o `RULE_STAFF && id = @request.auth.id`, más `@request.body.<campo>:isset = false` por cada campo bloqueado).
- Crear `api/src/lib/rules.test.ts`: strings exactos, paréntesis, rol desconocido lanza error, `ruleRoles("owner")` equivale a `RULE_OWNER`.
- Eliminar `smoke.test.ts`.

## Criterios de aceptación

- [x] `bun test` pasa con los casos de strings y de error.
- [x] Ninguna función usa `$app`, `__hooks` ni globals de PocketBase.
- [x] `bun run build:ts` genera `pb_hooks/lib/rules.js` y no genera `rules.test.js`.

## Referencias

- `features/005-api-fundamentos-roles-y-auditoria/spec.md`, sección "Fase 1" → tarea 004.
- https://pocketbase.io/docs/api-rules-and-filters/

## Fuera de alcance

- Aplicar las reglas a `admins` (tarea 005).
- Reglas de otras colecciones (cada feature de módulo).

## Notas de implementación


Pasaron cuatro pruebas de reglas puras. El build generó rules.js y excluyó rules.test.ts. ruleRoles rechaza una lista vacía para evitar conceder acceso por omisión.
