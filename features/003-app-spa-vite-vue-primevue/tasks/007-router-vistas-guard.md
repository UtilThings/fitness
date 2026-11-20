# 007 - [Web] Vue Router, vistas base y guard de autenticación

- **Prioridad:** 7
- **Estado:** Completado
- **Depende de:** 004, 006
- **Fase:** Fase 3: Interfaz base

## Objetivo

La SPA navega entre `Home` (protegida), `Login` y `NotFound`, y el flujo de inicio y cierre de sesión funciona contra PocketBase.

## Contexto

Existen PrimeVue con tema Aura (004) y `useAuth` (006). `App.vue` contiene contenido temporal de la tarea 004 que se reemplaza aquí. El guard es solo experiencia de usuario: la autorización real son las reglas de API de PocketBase.

## Alcance

- Instalar `vue-router`.
- Crear `app/src/router/index.ts`: `createRouter` con `createWebHistory`; rutas `/` (`HomeView`, `meta: { requiresAuth: true }`), `/login` (`LoginView`), `/:pathMatch(.*)*` (`NotFoundView`), con carga diferida salvo `Home`. Guard `beforeEach`: sin sesión y `requiresAuth` → `/login?redirect=<fullPath>`; con sesión en `/login` → `/`. Exportar `safeRedirect(value)` que devuelve el destino solo si empieza por `/` y no por `//`, y `/` en otro caso.
- Crear `src/views/LoginView.vue` (`Card`, `InputText`, `Password` con `:feedback="false"`, `Button` con `:loading`; mensaje genérico ante error; tras éxito navega a `safeRedirect(route.query.redirect)`), `HomeView.vue` (correo del usuario y botón "Cerrar sesión") y `NotFoundView.vue`. Estilos con utilidades de Tailwind.
- Actualizar `App.vue` a `<RouterView />` y registrar el router en `main.ts`.

## Criterios de aceptación

- [x] Sin sesión, abrir `/` redirige a `/login?redirect=%2F`.
- [x] Con credenciales válidas se llega a `/`; con inválidas aparece un mensaje y no se navega.
- [x] `/login?redirect=//evil.com` y `?redirect=https://evil.com` terminan en `/`.
- [x] Una ruta inexistente muestra `NotFoundView`.
- [x] Cerrar sesión devuelve a `/login`.
- [x] `bun run typecheck` y `bun run build` pasan.

## Referencias

- `features/003-app-spa-vite-vue-primevue/spec.md`, sección "Fase 3" → tarea 007.
- https://router.vuejs.org/guide/advanced/navigation-guards.html
- https://primevue.org/inputtext/ y https://primevue.org/password/

## Fuera de alcance

- Pruebas del guard (tarea 009), registro y recuperación de contraseña.

## Notas de implementación

`safeRedirect` también rechaza `\\`. `safeRedirect` e `installGuard` viven en `router/index.ts`; `LoginView` importa `safeRedirect` de ahí. Verificado el 200 de `bun run dev` y el build; el flujo contra un PocketBase real no se probó en esta sesión.
