# 005 - [Rutas] Guard por rol y vista 403

- **Prioridad:** 5
- **Estado:** Completado
- **Depende de:** 004
- **Fase:** Fase 2

## Objetivo

Las rutas pueden declarar `meta.roles` y quien no tenga el rol ve una pantalla 403 dentro del layout.

## Contexto

`router/index.ts` define `RouteMeta { requiresAuth, title }` e `installGuard` que revisa `to.matched.some(r => r.meta.requiresAuth)` y redirige las rutas de auth si ya hay sesión. `router/index.test.ts` prueba el guard. Las rutas protegidas son hijas de `AdminLayout`.

## Alcance

- Modificar `app/src/router/index.ts`: `RouteMeta.roles?: Role[]`; en `installGuard`, tras la comprobación de sesión, si alguna ruta coincidente define `roles` y `useAuth().role` no está incluido, devolver `{ name: "forbidden" }` (sin conservar el destino).
- Crear `app/src/views/ForbiddenView.vue` con icono, título «No tienes permiso para ver esta página», texto breve y botón «Volver al inicio»; registrarla como ruta `forbidden` (`/forbidden`, hija de `AdminLayout`, `meta.title: "Sin permiso"`).
- Actualizar `router/index.test.ts`: coach en ruta de owner → `forbidden`; owner → pasa; ruta sin `roles` → pasa para cualquiera con sesión; sin sesión → `login` con `redirect`.

## Criterios de aceptación

- [x] Un coach que abre una ruta con `meta.roles = ["owner"]` termina en `/forbidden`.
- [x] Un owner entra a esa misma ruta.
- [x] Sin sesión se sigue redirigiendo a `/login?redirect=...`.
- [x] `bun run typecheck`, `lint`, `test`, `build` pasan.

## Referencias

- `features/006-app-base-de-modulos/spec.md`, sección "Fase 2" → tarea 005.
- https://router.vuejs.org/guide/advanced/meta.html

## Fuera de alcance

- Filtrado del menú por rol (tarea 008).

## Notas de implementación

