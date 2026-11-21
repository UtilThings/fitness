# 004 - [Composable] useAuth con rol y can()

- **Prioridad:** 4
- **Estado:** Completado
- **Depende de:** 001
- **Fase:** Fase 2

## Objetivo

`useAuth` expone el rol del admin y `can(permiso)`, apoyado en una matriz de permisos única.

## Contexto

`useAuth.ts` guarda `user` (`shallowRef<AuthRecord>`) y `valid`; `avatarUrl` ya apunta a `admins`. Tras la feature 005, el registro de `admins` incluye `role` y `active`. La API es la autoridad: la UI solo oculta acciones.

## Alcance

- Crear `app/src/lib/permissions.ts`: tipo `Permission` (`team.read`, `team.manage`, `profile.edit`, `audit.read`), `PERMISSIONS: Record<Permission, Role[]>` (`team.read` y `profile.edit` para todos; `team.manage` y `audit.read` solo owner) y `roleCan(role, permission)`. Comentario: cada feature añade sus permisos.
- Modificar `useAuth`: `role` (computed, `null` si falta o no es un rol válido de `ROLES`), `isOwner`, `isActive` (`user.active !== false`) y `can(permission)` (falso sin sesión, sin rol o inactivo). Tipar `user` con `Admin` cuando exista.
- Si `isActive` es falso con sesión válida, `useAuth` hace `logout()` al detectar el cambio de `authStore`.
- Ampliar `useAuth.test.ts` y crear `permissions.test.ts`: cada rol contra cada permiso, sin sesión, rol inválido, inactivo.

## Criterios de aceptación

- [x] `can("team.manage")` es verdadero solo para owner activo.
- [x] Sin sesión, con rol desconocido o con `active = false`, `can()` devuelve `false`.
- [x] Las pruebas existentes de `useAuth` siguen en verde.
- [x] `bun run typecheck`, `lint`, `test` pasan.

## Referencias

- `features/006-app-base-de-modulos/spec.md`, sección "Fase 2" → tarea 004.
- `app/src/composables/useAuth.ts`.

## Fuera de alcance

- Guard de rutas (tarea 005) y filtro del menú (tarea 008).
- Gestión de roles de otros admins (feature 007).

## Notas de implementación

