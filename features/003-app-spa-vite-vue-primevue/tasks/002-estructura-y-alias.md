# 002 - [Config] Estructura de carpetas y alias de rutas

- **Prioridad:** 2
- **Estado:** Completado
- **Depende de:** 001
- **Fase:** Fase 1: Base del proyecto

## Objetivo

El código de `app/src/` tiene una estructura definida y el alias `@/` funciona en TypeScript, Vite y Vue.

## Contexto

Tras la tarea 001 existen `src/main.ts` y `src/App.vue`. `web/` usa el alias `@/*` → `src/*`.

## Alcance

- Crear `app/src/{assets,components,composables,lib,router,views,styles}/` con `.gitkeep` en las que queden vacías tras esta tarea.
- Alias `@/*` → `src/*` en `tsconfig.app.json` (`paths`) y en `vite.config.ts` (`resolve.alias`, usando `fileURLToPath(new URL('./src', import.meta.url))`).
- Crear `app/.gitignore` (`node_modules`, `dist`, `*.tsbuildinfo`, `.env`, `.env.*` salvo `.env.example`) y `app/public/favicon.svg` enlazado en `index.html`.
- Cambiar `main.ts` para importar `App` con `@/App.vue` y comprobar el alias.

## Criterios de aceptación

- [x] `bun run typecheck` y `bun run build` pasan usando `import App from '@/App.vue'`.
- [x] Las carpetas existen y `git status` no lista `node_modules`, `dist` ni `.env`.
- [x] El favicon se sirve en dev.

## Referencias

- `features/003-app-spa-vite-vue-primevue/spec.md`, sección "Fase 1" → tarea 002.
- https://vite.dev/config/shared-options.html#resolve-alias

## Fuera de alcance

- Contenido de las carpetas: lo aportan las tareas 004-007.

## Notas de implementación

Creadas las carpetas, `.gitkeep` solo en `assets` y `components` (las demás tienen código). Alias en `tsconfig.app.json` (sin `baseUrl`, usa `paths` relativo) y `vite.config.ts`. Favicon SVG provisional.
