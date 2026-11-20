# 006 - [Web] Footer, layout base y retiro de la demo

- **Prioridad:** 6
- **Estado:** Completado
- **Depende de:** 001, 002, 004, 005
- **Fase:** Fase 2: Layout compartido

## Objetivo

Todas las páginas comparten un layout con head completo (SEO, Open Graph, favicon), header, footer y el script de idioma; la demo del contador deja de existir.

## Contexto

`BaseLayout.astro` actual centra el contenido en un `grid` con fondo `slate-50`, y `index.astro` monta `Counter` con `client:load`. `Counter.vue` y `Counter.test.ts` solo existen para la demo. `web/README.md` menciona el contador (se actualiza en la 022). El original usa `<main class="min-h-screen">` entre header y footer, y el footer: `footer` `border-t border-border bg-surface`; rejilla `mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-3` con (1) logo y texto `Boutique personal training & small-group fitness in Miramar, Florida.` (`text-sm text-muted-foreground`), (2) `grid grid-cols-2 gap-2 text-sm` con los 8 enlaces (`text-muted-foreground hover:text-primary`), (3) `text-sm text-muted-foreground` con eyebrow "Studio", "Miramar, FL" y un enlace `mt-4 inline-block text-primary` "Contact →"; debajo `p` `pb-8 text-center text-xs text-muted-foreground`: `© <año> JQ Fitness. All rights reserved.` NO replicar el `#lovable-badge` ni el script `cdn.gpteng.co/lovable.js`.

## Alcance

- Crear `web/src/components/Footer.astro` con el marcado anterior; textos de enlaces y "Contact" con `<T k="..." />`; año con `new Date().getFullYear()`.
- Reescribir `web/src/layouts/BaseLayout.astro`: props `title`, `description`, `canonical?`; `<html lang="en">`; metas `description`, `og:title`, `og:description`, `og:type=website`, `twitter:card=summary_large_image`; `<link rel="icon" type="image/png" href="/favicon.png">`; importa `global.css`; `<Header client:load currentPath={Astro.url.pathname} logoSrc=... />`, `<main class="min-h-screen"><slot /></main>`, `<Footer />` y `<script>import '@/scripts/i18n-client'</script>`.
- Sin `grid`, `place-items-center` ni fondo `slate-50` en `body`.
- Eliminar `web/src/components/Counter.vue` y `Counter.test.ts`.
- Modificar `web/src/pages/index.astro` y `404.astro` para que compilen con el layout nuevo (contenido provisional; se completan en las tareas 008 y 014).
- Límites: sin contenido final de páginas.

## Criterios de aceptación

- [x] El HTML generado de `/` contiene `<header`, `<main class="min-h-screen"`, `<footer` y los 8 enlaces del nav y del footer.
- [x] `grep -ri "lovable" web/dist` no devuelve coincidencias.
- [x] El `<title>`, `description` y `og:title` del layout reflejan las props de cada página.
- [x] No quedan referencias a `Counter` en `web/src` (`grep -rn Counter web/src` sin resultados).
- [x] En `bun run dev`, cambiar a ES en el header traduce nav y "Contact →" del footer sin recargar.
- [x] `bun run lint`, `bun run format:check`, `bun run check`, `bun run test` y `bun run build` pasan en verde.

## Referencias

- `features/002-web-replica-lovable/spec.md`, "Fase 2" → tarea 006.
- `features/002-web-replica-lovable/reference/html/home.html` (marcado del footer).
- https://docs.astro.build/en/basics/layouts/

## Fuera de alcance

- Componentes de página (tarea 007) y contenido final de `/` y 404 (tareas 008 y 014).
- Actualizar `README.md` (tarea 022).

## Notas de implementación

Chromium confirmó el cambio a español en la navegación y en el CTA del footer sin recargar.
