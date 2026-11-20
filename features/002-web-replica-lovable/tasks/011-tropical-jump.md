# 011 - [Web] Página `/tropical-jump`

- **Prioridad:** 11
- **Estado:** Completado
- **Depende de:** 003, 006, 007, 008
- **Fase:** Fase 3: Páginas estáticas

## Objetivo

`/tropical-jump` replica el original: hero, dos planes, tarjeta con las clases semanales, políticas y banda CTA.

## Contexto

Referencia: `reference/html/tropical-jump.html`. Título `Tropical Jump Trampoline Classes | JQ Fitness`; descripción `High-energy trampoline fitness. $15 per class, first class free. Mon & Wed 7:30 PM, Sat 9:00 AM.` Usa `jumpPlans` (003). El plan `First Class` tiene precio 0 y se muestra como `FREE`.

## Alcance

Crear `web/src/pages/tropical-jump.astro`:

- `PageHero`: eyebrow `Tropical Jump`, título `Jump. Sweat. Vibe.`, imagen `jump.jpg`, subtítulo `A high-energy, low-impact trampoline workout set to tropical beats. Burn calories, build endurance, and have a blast.`
- `Section` con rejilla `grid gap-6 md:grid-cols-3`: `PricingCard` `Single Class` (CTA `Book now` → `/schedule`), `PricingCard` `First Class` (destacada, CTA `Book now` → `/schedule`) y tarjeta `card-surface p-7` con eyebrow `Weekly classes` y 3 filas (nombre del día en `font-display text-xl uppercase` y hora): `Monday` `7:30 PM`, `Wednesday` `7:30 PM`, `Saturday` `9:00 AM`.
- Debajo, un `PolicyCard` con:
  - `First class free — one per client account.`
  - `Full class? Join the waitlist and we'll notify you if a spot opens.`
  - `Cancel or reschedule at least 12 hours before class.`
- `CtaBand`.

## Criterios de aceptación

- [x] `dist/tropical-jump/index.html` contiene `$15`, `FREE`, la nota `One per client account.` y los 3 días con sus horas.
- [x] Solo `First Class` lleva `Most popular` y botón primario.
- [x] Se muestran las 3 políticas.
- [x] A 390 px todo se apila sin scroll horizontal.
- [x] `bun run lint`, `bun run format:check`, `bun run check`, `bun run test` y `bun run build` pasan en verde.

## Referencias

- `features/002-web-replica-lovable/spec.md`, "Fase 3" → tarea 011.
- `features/002-web-replica-lovable/reference/html/tropical-jump.html`

## Fuera de alcance

- Lista de espera funcional (la política solo describe el comportamiento).

## Notas de implementación

Se verificó el HTML generado y la presentación a 390 px y 1440 px con Chromium.
