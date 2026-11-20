# 010 - [Web] Página `/group-strength-training`

- **Prioridad:** 10
- **Estado:** Completado
- **Depende de:** 003, 006, 007, 008
- **Fase:** Fase 3: Páginas estáticas

## Objetivo

`/group-strength-training` replica el original: hero, dos planes, tarjeta de drop-in, horario semanal fijo, políticas y banda CTA.

## Contexto

Referencia: `reference/html/group-strength-training.html`. Título `Group Strength Training | JQ Fitness`; descripción `Small-group strength classes, max 6 people. Tuesdays & Thursdays at 9:00 AM, 5:30 PM and 7:00 PM.` Usa `groupPlans` (003) y los componentes de la 007.

## Alcance

Crear `web/src/pages/group-strength-training.astro`:

- `PageHero`: eyebrow `Group Strength`, título `Small group. Big results.`, imagen `group.jpg`, subtítulo `Coached strength training with a maximum of 6 people per class — the attention of personal training with the energy of a team.`
- `Section` con rejilla `grid gap-6 md:grid-cols-3`: `PricingCard` de `8-Class Pack` (destacada, CTA `Book a class` → `/schedule`), `PricingCard` de `16-Week Commitment` (CTA `Book a class` → `/schedule`) y tarjeta `card-surface flex flex-col p-7` con `h3.text-2xl` `Drop-in & Intro`, `p.mt-4.text-muted-foreground` `Single drop-in classes available. New here? Ask about a free introductory class.` y enlace `btn btn-outline mt-auto` `Ask about intro` → `/contact`.
- Rejilla `mt-12 grid gap-6 md:grid-cols-2`: tarjeta `card-surface p-7` con eyebrow `Weekly schedule`, `p.font-display.text-3xl.uppercase` `Tuesday & Thursday` y `div.mt-4.flex.flex-wrap.gap-3` con tres `span` `rounded-full border border-primary px-4 py-2 font-bold text-primary`: `9:00 AM`, `5:30 PM`, `7:00 PM`; y `PolicyCard` con:
  - `Classes are 60 minutes, capped at 6 participants.`
  - `8-class packs expire after 4 weeks.`
  - `16-week commitment is billed every 4 weeks for 4 periods.`
  - `Cancel at least 12 hours before class to keep your credit.`
- `CtaBand`.

## Criterios de aceptación

- [x] `dist/group-strength-training/index.html` contiene `$260`, `$200`, la nota `Requires a 16-week commitment (4 billing periods).` y los tres horarios.
- [x] Solo `8-Class Pack` lleva `Most popular`; los botones de planes van a `/schedule` y `Ask about intro` a `/contact`.
- [x] A 390 px todo se apila sin scroll horizontal; a 1440 px la primera rejilla tiene 3 columnas.
- [x] `bun run lint`, `bun run format:check`, `bun run check`, `bun run test` y `bun run build` pasan en verde.

## Referencias

- `features/002-web-replica-lovable/spec.md`, "Fase 3" → tarea 010.
- `features/002-web-replica-lovable/reference/html/group-strength-training.html`

## Fuera de alcance

- Reserva real de clases (tarea 019 enlaza al calendario).

## Notas de implementación

Se verificó el HTML generado y la presentación a 390 px y 1440 px con Chromium.
