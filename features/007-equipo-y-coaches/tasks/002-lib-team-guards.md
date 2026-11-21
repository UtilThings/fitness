# 002 - [Lib] Lógica pura de reglas de equipo

- **Prioridad:** 2
- **Estado:** Pendiente
- **Depende de:** Feature 005 (contrato)
- **Fase:** Fase 1

## Objetivo

Las reglas de negocio de equipo (último owner, auto-desactivación, borrado con referencias) existen como funciones puras y probadas.

## Contexto

La feature 005 deja `api/src/lib/` con lógica pura y pruebas `bun test`. Las relaciones hacia `admins` crecerán con cada feature (008, 009, 011, 014); hoy solo existe `audit_logs.actor`. Goja no comparte scope: el hook cargará la lib con `require` dentro del callback.

## Alcance

- Crear `api/src/lib/team-guards.ts`: `ADMIN_REFERENCES: { collection: string; field: string }[]` (inicial `audit_logs.actor`), `checkAdminChange({ before, after, actorId, activeOwners })` → `null` o `{ status, message }` (impide dejar 0 owners activos, desactivarse a sí mismo y que el último owner se degrade) y `canDeleteAdmin({ referencesCount, isLastOwner, isSelf })` → `null` o `{ status, message }` (409 con referencias).
- Crear `api/src/lib/team-guards.test.ts`: cada caso de la tabla de contrato, owner → coach con otro owner activo (permitido), desactivar owner con otro activo (permitido), cambio que no toca `role` ni `active` (permitido), mensajes en español.

## Criterios de aceptación

- [ ] `bun test` pasa con todos los casos.
- [ ] Las funciones no usan globals de PocketBase.
- [ ] `bun run build:ts` genera `pb_hooks/lib/team-guards.js`.

## Referencias

- `features/007-equipo-y-coaches/spec.md`, sección "Contrato" y "Fase 1" → tarea 002.
- `api/src/lib/rules.ts` (feature 005, patrón de lib pura).

## Fuera de alcance

- Hook que aplica las reglas (tarea 003).

## Notas de implementación

