# 005 - [Web] Layout base, página de inicio e isla Vue de ejemplo

- **Prioridad:** 5
- **Estado:** Completado
- **Depende de:** 002, 003, 004
- **Fase:** Fase 2: Interfaz base

## Objetivo

El sitio muestra una página de inicio con layout base y un componente Vue hidratado que responde a la interacción, y una página 404.

## Contexto

Dependen de esta tarea: estructura y alias (002), `global.css` (003) y `env` (004). Verificar que existen antes de empezar.

## Alcance

- Crear `web/src/layouts/BaseLayout.astro`: `<html lang="es">`, props `title` y `description`, importa `@/styles/global.css`, `<slot />`.
- Crear `web/src/components/Counter.vue`: `<script setup lang="ts">`, prop opcional `initial` (number, por defecto 0), estado con `ref`, botón que incrementa, texto con el valor (`data-testid` para pruebas).
- Modificar `web/src/pages/index.astro`: usa `BaseLayout` y monta `<Counter client:load />`.
- Crear `web/src/pages/404.astro`: mensaje y enlace a inicio.
- Límites: sin contenido de negocio ni navegación compleja.

## Criterios de aceptación

- [x] `bun run build` genera `dist/index.html` y `dist/404.html`.
- [x] En `bun run dev`, el contador incrementa al hacer clic (hidratación funcionando).
- [x] Estilos de Tailwind visibles en la página.
- [x] `<html lang="es">` presente en el HTML generado.

## Referencias

- `features/001-web-astro-vue-boilerplate/spec.md`, sección "Fase 2" → tarea 005.
- https://docs.astro.build/en/basics/layouts/
- https://docs.astro.build/en/guides/framework-components/
- https://docs.astro.build/en/reference/directives-reference/#client-directives

## Fuera de alcance

- Pruebas del componente (tarea 007); diseño definitivo.

## Notas de implementación

El build generó index.html y 404.html con lang="es". Chromium comprobó la hidratación, el clic del contador y el color de Tailwind. También comprobó un import temporal con el alias @/ dentro de Vue, que se retiró.
