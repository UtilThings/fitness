# 013 - [Web] Página `/about`

- **Prioridad:** 13
- **Estado:** Completado
- **Depende de:** 002, 006, 007
- **Fase:** Fase 3: Páginas estáticas

## Objetivo

`/about` replica el original: hero con imagen, tres valores y la banda CTA.

## Contexto

Referencia: `reference/html/about.html`. Título `About JQ Fitness | Miramar Boutique Studio`; descripción `A community-driven boutique fitness studio in Miramar, Florida focused on real results.` Imagen del hero: `group.jpg`.

## Alcance

Crear `web/src/pages/about.astro`:

- `PageHero`: eyebrow `About`, título `Built on community.`, imagen `group.jpg`, subtítulo `JQ Fitness is a boutique studio in Miramar, Florida where coaching is personal, classes stay small, and every client is part of the team.`
- `Section` con clase `grid gap-6 md:grid-cols-3` y tres `div.card-surface.p-7` con `h2.text-3xl.text-primary` y `p.mt-3.text-muted-foreground`:
  - `Energetic` — `Every session is built to leave you better than you came in.`
  - `Welcoming` — `All levels, all backgrounds. Start where you are.`
  - `Results-focused` — `Smart programming and accountability that actually works.`
- `CtaBand`.

## Criterios de aceptación

- [x] `dist/about/index.html` contiene el h1 `Built on community.`, los 3 valores con sus textos y la banda CTA.
- [x] A 390 px las tarjetas se apilan; a 1440 px son 3 columnas.
- [x] `bun run lint`, `bun run format:check`, `bun run check`, `bun run test` y `bun run build` pasan en verde.

## Referencias

- `features/002-web-replica-lovable/spec.md`, "Fase 3" → tarea 013.
- `features/002-web-replica-lovable/reference/html/about.html`

## Fuera de alcance

- Contenido adicional (equipo, historia) que el original no tiene.

## Notas de implementación

Se verificó el HTML generado y la presentación a 390 px y 1440 px con Chromium.
