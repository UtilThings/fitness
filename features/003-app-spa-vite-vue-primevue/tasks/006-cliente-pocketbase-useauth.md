# 006 - [Módulo] Cliente PocketBase y composable useAuth

- **Prioridad:** 6
- **Estado:** Completado
- **Depende de:** 002, 005
- **Fase:** Fase 2: Integraciones

## Objetivo

La SPA dispone de una única instancia del SDK de PocketBase y de un composable reactivo para iniciar y cerrar sesión.

## Contexto

`src/lib/env.ts` (tarea 005) aporta `env.pocketbaseUrl`. `api/` es un PocketBase con la colección `users` por defecto. El SDK (`pocketbase` 0.29.x) persiste `authStore` en `localStorage` y notifica cambios con `pb.authStore.onChange`.

## Alcance

- Instalar `pocketbase`.
- Crear `app/src/lib/pocketbase.ts`: `export const pb = new PocketBase(env.pocketbaseUrl)`.
- Crear `app/src/composables/useAuth.ts`: estado de módulo `user` (`shallowRef` del registro o `null`) inicializado desde `pb.authStore.record` y sincronizado con `pb.authStore.onChange`; `isAuthenticated` (`computed` sobre `pb.authStore.isValid`); `login(email, password)` con `pb.collection('users').authWithPassword`; `logout()` con `pb.authStore.clear()`.
- Los errores de `login` se propagan al llamador (la vista decide el mensaje).

## Criterios de aceptación

- [x] `pb` es la única instancia de `PocketBase` en `src/`.
- [x] `login` correcto deja `isAuthenticated` en `true`; `logout` lo deja en `false` y `user` en `null`.
- [x] Con un token válido previo en `localStorage`, `useAuth()` arranca autenticado.
- [x] `bun run typecheck` pasa.

## Referencias

- `features/003-app-spa-vite-vue-primevue/spec.md`, sección "Fase 2" → tarea 006.
- https://github.com/pocketbase/js-sdk#authstore
- https://pocketbase.io/docs/authentication/

## Fuera de alcance

- Registro, recuperación de contraseña y OAuth2.
- Pruebas (tarea 009) y vistas que lo consumen (007).

## Notas de implementación

`useAuth` mantiene estado a nivel de módulo (compartido entre llamadas) con `shallowRef` de `user` y de validez, actualizados desde `pb.authStore.onChange`, porque `isValid` del authStore no es reactivo por sí solo.
