# 009 - [Web] Página `/personal-training`

- **Prioridad:** 9
- **Estado:** Completado
- **Depende de:** 003, 006, 007, 008
- **Fase:** Fase 3: Páginas estáticas

## Objetivo

`/personal-training` replica el original: hero con imagen, planes 1-on-1 y Partner, políticas, lo que incluye, y la banda de primera clase gratis.

## Contexto

Referencia: `reference/html/personal-training.html`. Título `Personal Training | JQ Fitness Miramar`; descripción `One-on-one and partner personal training packages in 4-week blocks, from $800.` Usa `PageHero`, `Section`, `PricingCard`, `PolicyCard`, `CtaBand` y los datos `personalOneOnOne` y `personalPartner` (003).

## Alcance

Crear `web/src/pages/personal-training.astro`:

- `PageHero`: eyebrow `Personal Training`, título `Coaching built for you.`, imagen `personal.jpg`, subtítulo `One-on-one and partner sessions with a plan designed around your body, schedule and goals. Billed in 4-week blocks.`
- `Section`: `h2.text-4xl.md:text-5xl` `One-on-one` y rejilla `mt-8 grid gap-6 md:grid-cols-3` con las 3 tarjetas de `personalOneOnOne` (la 2.ª destacada), CTA `Request a schedule` a `/contact`.
- `h2.mt-16.text-4xl.md:text-5xl` `Partner training` y rejilla con las 3 tarjetas de `personalPartner` (ninguna destacada), mismo CTA.
- Rejilla `mt-12 grid gap-6 md:grid-cols-2` con `PolicyCard` (4 elementos):
  - `Each session is 60 minutes; packages run in 4-week blocks.`
  - `Sessions expire at the end of each 4-week block.`
  - `Purchase does not reserve a set time — request your preferred slots and we confirm based on trainer availability.`
  - `Reschedule or cancel at least 24 hours in advance to keep your session.`
  y tarjeta `card-surface p-7` con eyebrow `What's included` y `ul.space-y-2.text-sm.text-muted-foreground` de `• Initial assessment & goal setting`, `• Personalized program`, `• Form coaching every session`, `• Progress tracking`.
- `CtaBand`.

## Criterios de aceptación

- [x] `dist/personal-training/index.html` contiene los 6 precios: $800, $1,080, $1,280, $1,127, $1,447 y $1,597.
- [x] Solo la tarjeta `3x / week` muestra `Most popular` y botón primario; los 6 botones dicen `Request a schedule` y apuntan a `/contact`.
- [x] Se muestran las 4 políticas y los 4 elementos de "What's included".
- [x] A 390 px las tarjetas se apilan; a 1440 px van de 3 en 3.
- [x] `bun run lint`, `bun run format:check`, `bun run check`, `bun run test` y `bun run build` pasan en verde.

## Referencias

- `features/002-web-replica-lovable/spec.md`, "Fase 3" → tarea 009.
- `features/002-web-replica-lovable/reference/html/personal-training.html`

## Fuera de alcance

- Formulario de solicitud (el CTA solo enlaza a `/contact`).

## Notas de implementación

Se verificó el HTML generado y la presentación a 390 px y 1440 px con Chromium.
