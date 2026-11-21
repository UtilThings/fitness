# 008 - [Rutas] Rutas de equipo y perfil y entradas de menú

- **Prioridad:** 8
- **Estado:** Completado
- **Depende de:** 003, 006, 007
- **Fase:** Fase 3

## Objetivo

Las vistas de equipo y perfil son accesibles desde rutas y menú reales, sin los marcadores de navegación que reemplazan.

## Contexto

`router/index.ts` tiene solo `dashboard` y `forbidden` (006). `admin-nav.ts` tiene `Equipo` (`/team`) como `placeholder`. El menú de usuario de `AdminLayout.vue` tiene «Ajustes» sin destino.

## Alcance

- Modificar `app/src/router/index.ts`: rutas hijas de `AdminLayout` `team` (`/team`, `meta.title: "Equipo"`), `team-member` (`/team/:id`, `meta.title: "Ficha del equipo"`) y `profile` (`/settings/profile`, `meta.title: "Mi perfil"`), con carga diferida.
- Modificar `app/src/layouts/admin-nav.ts`: retirar `placeholder` de `Equipo` y añadir `Mi perfil` (`/settings/profile`, `pi pi-user`) en Ajustes.
- Modificar `AdminLayout.vue`: «Ajustes» del menú de usuario navega a `/settings/profile`.
- Actualizar `router/index.test.ts` (rutas nuevas protegidas) y `admin-nav.test.ts` (la ruta de `Equipo` existe, `Mi perfil` presente).

## Criterios de aceptación

- [x] Sin sesión, `/team` y `/settings/profile` redirigen a `/login?redirect=...`.
- [x] El menú muestra «Equipo» y «Mi perfil»; el menú de usuario lleva a `/settings/profile`.
- [x] `admin-nav.test.ts` confirma que los items sin `placeholder` tienen ruta.
- [x] `bun run typecheck`, `lint`, `test`, `build` pasan.

## Referencias

- `features/007-equipo-y-coaches/spec.md`, sección "Fase 3" → tarea 008.
- `app/src/router/index.ts`, `app/src/layouts/admin-nav.ts`.

## Fuera de alcance

- Retirar otros marcadores (cada feature retira los suyos).

## Notas de implementación

Verificado en Edge con una sesión de PocketBase: redirección al login, enlaces Equipo y Mi perfil, y navegación desde Ajustes del menú de usuario.
