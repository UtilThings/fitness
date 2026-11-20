# 003 - [Config] Tailwind CSS v4 y estilos globales

- **Prioridad:** 3
- **Estado:** Completado
- **Depende de:** 001, 002
- **Fase:** Fase 1: Base del proyecto

## Objetivo

Las utilidades de Tailwind CSS v4 se aplican en cualquier componente de la SPA.

## Contexto

`web/` ya usa Tailwind v4 con `@tailwindcss/vite`. Existe `src/styles/` (tarea 002). Tailwind v4 no usa `tailwind.config.js`: se configura en CSS con `@theme`.

## Alcance

- Instalar `tailwindcss` y `@tailwindcss/vite`; registrar `tailwindcss()` en `plugins` de `vite.config.ts`.
- Crear `app/src/styles/main.css` con `@import "tailwindcss";` y un `@theme` base (`--font-sans` con pila del sistema).
- Importar `@/styles/main.css` en `main.ts`.
- Usar una clase de Tailwind en `App.vue` para comprobarlo.

## Criterios de aceptación

- [x] `bun run build` genera un CSS que contiene la utilidad usada en `App.vue`.
- [x] En `bun run dev` la clase se aplica visualmente.
- [x] No existe `tailwind.config.*` ni `postcss.config.*`.

## Referencias

- `features/003-app-spa-vite-vue-primevue/spec.md`, sección "Fase 1" → tarea 003.
- https://tailwindcss.com/docs/installation/using-vite

## Fuera de alcance

- Integración con PrimeVue (tarea 004).

## Notas de implementación

`main.css` importa Tailwind y, tras la tarea 004, `tailwindcss-primeui`. Sin `tailwind.config.*`.
