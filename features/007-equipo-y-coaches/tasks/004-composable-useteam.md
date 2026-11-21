# 004 - [Composable] useTeam y generador de contraseñas

- **Prioridad:** 4
- **Estado:** Pendiente
- **Depende de:** Feature 006 (contrato), 003
- **Fase:** Fase 2

## Objetivo

Las vistas de equipo disponen de un composable con alta, cambio de rol y estado, avatar, borrado/desactivación y lista de coaches.

## Contexto

La feature 006 aporta `useCollection<T>`, `parsePbError`, `useNotify` y los tipos `Admin`/`Role`. El API (tarea 003) responde `409` cuando un admin tiene registros asociados. Los selectores de coach de 008 y 009 consumirán `coaches`.

## Alcance

- Crear `app/src/lib/password.ts`: `generatePassword(length = 12)` con `crypto.getRandomValues` sin caracteres ambiguos (`0O1lI`) y `validatePassword(text)` (mínimo 8, devuelve mensaje en español o `null`).
- Crear `app/src/composables/useTeam.ts` sobre `useCollection<Admin>("admins", { sort: "name" })`: `createMember(data)` (añade `passwordConfirm`, `emailVisibility: true`, `active: true`), `setRole(id, role)`, `setActive(id, active)`, `uploadAvatar(id, file)` con `FormData`, `deleteOrDeactivate(member)` que ante `status 409` devuelve `{ needsDeactivate: true }` sin tocar la lista, y `coaches` (carga de admins con `active = true` y rol `coach` u `owner`, parametrizada con `pb.filter`).
- Pruebas `password.test.ts` y `useTeam.test.ts` con `pb` mockeado.

## Criterios de aceptación

- [ ] `generatePassword()` devuelve 12 caracteres sin ambiguos y pasa `validatePassword`.
- [ ] `deleteOrDeactivate` ante un `409` devuelve `needsDeactivate` y no lanza.
- [ ] `createMember` envía `passwordConfirm` igual a `password`.
- [ ] `bun run typecheck`, `lint`, `test` pasan.

## Referencias

- `features/007-equipo-y-coaches/spec.md`, sección "Fase 2" → tarea 004.
- `app/src/composables/useCollection.ts` (feature 006).
- https://pocketbase.io/docs/files-handling/

## Fuera de alcance

- Componentes (tarea 005) y vistas (006-007).

## Notas de implementación

