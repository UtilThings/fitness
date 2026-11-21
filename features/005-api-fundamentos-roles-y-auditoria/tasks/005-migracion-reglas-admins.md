# 005 - [Migración] Cierre de reglas de admins

- **Prioridad:** 5
- **Estado:** Pendiente
- **Depende de:** 001, 004
- **Fase:** Fase 1

## Objetivo

La colección `admins` deja de aceptar registro abierto y aplica las reglas por rol; un admin desactivado no puede iniciar sesión.

## Contexto

Hoy: `createRule: ""`, `deleteRule: "id = @request.auth.id"`, `authRule: ""`. Con `role` y `active` ya presentes (tarea 001) y los strings definidos en `rules.ts` (tarea 004). Las migraciones usan literales; la coherencia se verifica con una prueba.

## Alcance

- Crear `api/pb_migrations/1795261200_updated_admins_rules.js`: `listRule` y `viewRule` = staff; `createRule` = owner; `updateRule` = owner `||` (staff `&& id = @request.auth.id && @request.body.role:isset = false && @request.body.active:isset = false`); `deleteRule` = owner `&& id != @request.auth.id`; `authRule` = `active = true`.
- `down`: restaurar `createRule: ""`, `deleteRule: "id = @request.auth.id"`, `authRule: ""` y las reglas de lista/vista/actualización previas leídas antes del cambio.
- Añadir a `rules.test.ts` una prueba que lea el archivo de la migración y compruebe que contiene `RULE_STAFF`, `RULE_OWNER` y el literal de `ruleOwnerOrSelf(["role", "active"])` más las condiciones `:isset = false`.

## Criterios de aceptación

- [ ] POST anónimo a `/api/collections/admins/records` → `403`.
- [ ] Un coach recibe `403`/`404` al intentar PATCH de otro admin, al enviar `role` o `active` en su propio PATCH, y al hacer DELETE.
- [ ] Un owner no puede borrarse a sí mismo (`403`/`404`) pero sí a otro admin.
- [ ] Un admin con `active = false` no obtiene token en `auth-with-password`.
- [ ] `bun test` pasa, incluida la prueba de coherencia.

## Referencias

- `features/005-api-fundamentos-roles-y-auditoria/spec.md`, sección "Modelo de datos" → `admins`.
- https://pocketbase.io/docs/api-rules-and-filters/

## Fuera de alcance

- Interfaz de gestión de equipo y protecciones de negocio (feature 007).

## Notas de implementación

