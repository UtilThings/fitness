# 002 - [Web] Assets de imagen, logo y favicon

- **Prioridad:** 2
- **Estado:** Completado
- **Depende de:** Feature 001 (boilerplate web)
- **Fase:** Fase 1: Fundamentos

## Objetivo

Las imágenes, el logo y el favicon del original están en `web/` y se pueden importar desde Astro, listas para las páginas.

## Contexto

Los originales están en `features/002-web-replica-lovable/reference/assets/`: `hero.jpg` (1920×1088), `personal.jpg`, `group.jpg`, `jump.jpg` (1280×960), `jq-logo.png` (666×714) y `favicon.png` (64×64). `web/public/` tiene `favicon.ico` y `favicon.svg` del boilerplate. No existe `web/src/assets/`.

## Alcance

- Crear `web/src/assets/` y copiar `hero.jpg`, `personal.jpg`, `group.jpg`, `jump.jpg` y `jq-logo.png`.
- Copiar `favicon.png` a `web/public/favicon.png`.
- Eliminar `web/public/favicon.svg` y `web/public/favicon.ico` del boilerplate (el layout de la tarea 006 usa `favicon.png`).
- Mantener intactos los archivos de `reference/`.
- Límites: sin cambios de código; las páginas los importan en sus tareas.

## Criterios de aceptación

- [x] `web/src/assets/` contiene exactamente los 5 archivos indicados y `web/public/favicon.png` existe.
- [x] Un `import hero from '@/assets/hero.jpg'` compila (`bun run check` sin errores de tipos para imágenes).
- [x] `web/public/favicon.svg` y `web/public/favicon.ico` ya no existen y nada del código los referencia (`grep -rn "favicon.svg\|favicon.ico" web/src` sin resultados, salvo `BaseLayout.astro` que se corrige en la 006).
- [x] `bun run lint`, `bun run format:check`, `bun run check`, `bun run test` y `bun run build` pasan en verde.

## Referencias

- `features/002-web-replica-lovable/spec.md`, "Fase 1" → tarea 002.
- https://docs.astro.build/en/guides/images/

## Fuera de alcance

- Optimización adicional de las imágenes y formatos nuevos (WebP/AVIF), salvo lo que haga `astro:assets` por defecto.

## Notas de implementación

Se compararon los seis archivos con los originales y se comprobó temporalmente la importación de hero.jpg en Astro.
