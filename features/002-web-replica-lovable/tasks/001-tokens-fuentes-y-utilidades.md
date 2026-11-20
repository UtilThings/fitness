# 001 - [Web] Tokens de diseño, fuentes y utilidades globales

- **Prioridad:** 1
- **Estado:** Completado
- **Depende de:** Feature 001 (boilerplate web)
- **Fase:** Fase 1: Fundamentos

## Objetivo

`global.css` define el sistema de diseño del original (tema oscuro, turquesa y ámbar, fuentes Anton y Barlow) y las utilidades `.btn`, `.eyebrow`, `.card-surface` y `.hero-fade`, de modo que las demás tareas puedan copiar las clases del original sin cambios.

## Contexto

`web/src/styles/global.css` solo tiene `@import 'tailwindcss'` y un `@theme` provisional (`--font-sans: system-ui`, `--color-primary: #0f766e`). El original usa Tailwind v4 con tokens en `:root` y los expone a Tailwind (`bg-background`, `text-primary`, `border-border`, `bg-surface`, `text-muted-foreground`, `bg-accent`, `border-input`, `text-destructive`). Antes de instalar, comprobar con `npm view @fontsource/anton version` y `npm view @fontsource/barlow version`. Los valores exactos están en la sección "Tokens de diseño" del spec.

## Alcance

- Instalar con Bun `@fontsource/anton` y `@fontsource/barlow`.
- Reescribir `web/src/styles/global.css`:
  - `@import 'tailwindcss';` y los imports de fuentes (`@fontsource/anton/400.css`; `@fontsource/barlow/{400,500,600,700}.css`).
  - `:root` con todos los tokens de la tabla del spec.
  - `@theme inline` que mapea `--color-*` a los tokens, `--font-sans`, `--font-display` y `--radius-xl: calc(var(--radius) + 4px)`.
  - `@layer base`: `body` (fondo `background`, color `foreground`, `font-sans`) y `h1, h2, h3` (`font-display`, mayúsculas, `letter-spacing:.01em`, `line-height:.95`, `font-size` y `font-weight` heredados).
  - `@layer components` o utilidades: `.btn`, `.btn-primary`, `.btn-outline`, `.btn-accent`, `.eyebrow`, `.card-surface`, `.hero-fade` con las definiciones del spec.
- Eliminar el `--color-primary: #0f766e` provisional.
- Límites: no tocar layout ni páginas (las clases de `BaseLayout.astro` se reescriben en la tarea 006).

## Criterios de aceptación

- [x] `web/package.json` incluye `@fontsource/anton` y `@fontsource/barlow`, y `bun.lock` está actualizado.
- [x] `global.css` define los 16 tokens del spec y las 7 utilidades (`.btn`, `.btn-primary`, `.btn-outline`, `.btn-accent`, `.eyebrow`, `.card-surface`, `.hero-fade`).
- [x] Un `<h1 class="text-6xl">` renderiza en Anton, mayúsculas y con `line-height:.95` (comprobable en el CSS generado de `dist/`).
- [x] El CSS generado contiene las clases `bg-primary`, `text-muted-foreground`, `border-border` y `bg-surface`.
- [x] `bun run lint`, `bun run format:check`, `bun run check`, `bun run test` y `bun run build` pasan en verde.

## Referencias

- `features/002-web-replica-lovable/spec.md`, sección "Tokens de diseño" y "Fase 1" → tarea 001.
- `features/002-web-replica-lovable/reference/html/home.html` (clases usadas).
- https://tailwindcss.com/docs/theme
- https://fontsource.org/docs/getting-started/install

## Fuera de alcance

- Layout, header y footer (tareas 005 y 006).
- Imágenes y favicon (tarea 002).

## Notas de implementación

Se verificó con npm la versión 5.3.0 de ambas fuentes y se contrastaron las clases y los textos con el snapshot local. El CSS de producción incluye la regla de títulos y las cuatro utilidades de color.
