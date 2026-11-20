# 002 - [Web] Reorganizar vistas y rutas anidadas

- **Prioridad:** 2
- **Estado:** Completado
- **Depende de:** 001
- **Fase:** Fase 1

## Objetivo

Las vistas están organizadas en `views/auth/` y `views/admin/` y el router usa layouts como rutas padre, con protección y títulos por ruta.

## Contexto

Existen `views/HomeView.vue`, `LoginView.vue` y `NotFoundView.vue`; el guard comprueba `to.meta.requiresAuth`, que con rutas hijas debe pasar a `to.matched.some`.

## Alcance

- Mover `LoginView` a `src/views/auth/` y `HomeView` a `src/views/admin/DashboardView.vue` (renombrar); `NotFoundView` queda en `src/views/`.
- Crear layouts provisionales `src/layouts/AuthLayout.vue` y `AdminLayout.vue` (solo `<RouterView />`).
- `router/index.ts`: padre `AuthLayout` con hijas `login` (`/login`) y `forgot-password` (`/forgot-password`, vista provisional hasta 004); padre `AdminLayout` con `meta.requiresAuth` e hija `dashboard` (`/`); `not-found`. Añadir `meta.title` (tipar `RouteMeta.title`).
- Guard: `to.matched.some(r => r.meta.requiresAuth)` y `to.name` de `login`/`forgot-password` con sesión → `/`.
- Actualizar `router/index.test.ts` al nuevo nombre `dashboard`.

## Criterios de aceptación

- [x] Sin sesión, `/` redirige a `/login?redirect=%2F`; con sesión `/login` lleva a `/`.
- [x] No quedan referencias a `HomeView`.
- [x] `bun run typecheck`, `lint`, `test` y `build` pasan.

## Referencias

- `features/004-app-layouts-auth-admin/spec.md`, sección "Fase 1" → tarea 002.
- https://router.vuejs.org/guide/essentials/nested-routes.html

## Fuera de alcance

- Diseño de los layouts (003, 005) y contenido de las vistas (004, 006).

## Notas de implementación

`HomeView` → `views/admin/DashboardView.vue`; `LoginView` → `views/auth/`. El guard usa `to.matched.some` y la lista `authRoutes`.
