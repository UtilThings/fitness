# 003 - [Web] Tailwind CSS v4 y estilos globales

- **Prioridad:** 3
- **Estado:** Pendiente
- **Depende de:** 001
- **Fase:** Fase 1: Base del proyecto

## Objetivo

Las clases de Tailwind funcionan en archivos Astro y Vue, con una hoja de estilos global y tokens base.

## Contexto

Se usa la integración vigente de Tailwind v4 mediante `@tailwindcss/vite` (no `@astrojs/tailwind`). Verificar con `npm view tailwindcss version` y la guía de Astro de estilos antes de instalar. La carpeta `src/styles/` se crea en la tarea 002; si esta tarea se ejecuta antes, crearla.

## Alcance

- Instalar con `bun add` `tailwindcss` y `@tailwindcss/vite`.
- Modificar `web/astro.config.mjs`: agregar el plugin en `vite.plugins`.
- Crear `web/src/styles/global.css` con `@import "tailwindcss";` y un bloque `@theme` con fuente sans y un color primario provisional.
- Límites: no importar el CSS en ningún layout todavía (tarea 005).

## Criterios de aceptación

- [ ] `bun run build` pasa en verde con el plugin registrado.
- [ ] `global.css` contiene `@import "tailwindcss"` y `@theme`.
- [ ] Una clase de Tailwind usada temporalmente en una página genera CSS en `dist/` (verificado y retirado).

## Referencias

- `features/001-web-astro-vue-boilerplate/spec.md`, sección "Fase 1" → tarea 003.
- https://docs.astro.build/en/guides/styling/#tailwind
- https://tailwindcss.com/docs/installation/framework-guides/astro

## Fuera de alcance

- Diseño visual definitivo y componentes de UI.

## Notas de implementación

<!-- Se completa al terminar la tarea. -->
