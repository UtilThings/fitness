# 001 - [Config] Inicializar proyecto Vite + Vue + TypeScript

- **Prioridad:** 1
- **Estado:** Completado
- **Depende de:** Ninguna
- **Fase:** Fase 1: Base del proyecto

## Objetivo

Existe un proyecto Vite + Vue 3 con TypeScript estricto en `app/`, que arranca, comprueba tipos y compila.

## Contexto

`app/` está vacía. Node v24.22.0, Bun 1.4.3. `web/` usa Bun y fija `engines.node` y `packageManager`; se replica la convención. Antes de generar nada, verificar con `npm view` las versiones y requisitos de Node de `vite`, `@vitejs/plugin-vue`, `vue-tsc` y `typescript`, y que `vue-tsc` funciona con `typescript` 7 (si no, fijar `typescript` a la mayor compatible y anotarlo).

## Alcance

- Crear `app/package.json` (`name: jq-fitness-app`, `private: true`, `type: module`, `engines.node: ">=22.12.0"`, `packageManager: bun@<bun -v>`) e instalar con `bun add` `vue` y con `bun add -d` `vite`, `@vitejs/plugin-vue`, `typescript`, `vue-tsc`, `@types/node`. Confirmar que queda `bun.lock` y no `package-lock.json`.
- Crear `app/.nvmrc` (`24`), `app/index.html` (`lang="es"`, `<div id="app">`, script `/src/main.ts`), `app/vite.config.ts` (plugin Vue), `app/tsconfig.json` con referencias a `tsconfig.app.json` (`strict`, `moduleResolution: bundler`, `noEmit`) y `tsconfig.node.json`.
- Crear `app/src/main.ts` (monta la app) y `app/src/App.vue` mínimo.
- Scripts: `dev`, `build` (`vue-tsc -b && vite build`), `preview`, `typecheck` (`vue-tsc -b`).
- Fuera de los límites: no crear carpetas de estructura (tarea 002) ni estilos (003).

## Criterios de aceptación

- [x] `cd app && bun run typecheck` y `bun run build` terminan sin errores.
- [x] `bun run dev` sirve `http://localhost:5173` con respuesta 200.
- [x] `tsconfig.app.json` tiene `strict: true`.
- [x] `bun.lock` existe, no hay `package-lock.json` y `bun install --frozen-lockfile` funciona.

## Referencias

- `features/003-app-spa-vite-vue-primevue/spec.md`, sección "Fase 1" → tarea 001.
- https://vite.dev/guide/
- https://vuejs.org/guide/typescript/overview.html

## Fuera de alcance

- Estructura de carpetas y alias (tarea 002), Tailwind (003), PrimeVue (004).

## Notas de implementación

Versiones confirmadas con npm: vite 8.3.8, @vitejs/plugin-vue 6.0.11, vue-tsc 3.3.14. `vue-tsc` falla con `typescript` 7.0.2 (`ERR_PACKAGE_PATH_NOT_EXPORTED ./lib/tsc`), así que `typescript` se fijó en `^6` (6.0.3). Tras una verificación completa, las dependencias de las tareas 003-009 se instalaron juntas al preparar el plan.
