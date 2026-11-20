# 012 - [Web] Página `/pricing`

- **Prioridad:** 12
- **Estado:** Completado
- **Depende de:** 003, 006, 007
- **Fase:** Fase 3: Páginas estáticas

## Objetivo

`/pricing` replica el original: hero y cuatro bloques de precios (Personal 1-on-1, Partner, Group Strength, Tropical Jump) más la banda CTA.

## Contexto

Referencia: `reference/html/pricing.html`. Título `Pricing & Packages | JQ Fitness`; descripción `Personal training from $800, group strength from $200 per 4 weeks, Tropical Jump $15 per class.` En esta página ninguna tarjeta es destacada y el CTA depende del bloque: `Inquire now` → `/contact` en Personal, `Book now` → `/schedule` en Group y Jump.

## Alcance

Crear `web/src/pages/pricing.astro`:

- `PageHero`: eyebrow `Pricing & Packages`, título `Invest in stronger.`, subtítulo `Transparent pricing. Packages billed in 4-week blocks unless noted. Online coaching pricing shared after consultation.` (sin imagen).
- Cuatro `Section` con clase `!py-10`, cada una con `h2.text-4xl` y rejilla `mt-6 grid gap-6 md:grid-cols-3` de `PricingCard`:
  1. `Personal Training — 1-on-1` → `personalOneOnOne`, `/contact`, `Inquire now`.
  2. `Personal Training — Partner` → `personalPartner`, `/contact`, `Inquire now`.
  3. `Group Strength` → `groupPlans`, `/schedule`, `Book now`.
  4. `Tropical Jump` → `jumpPlans`, `/schedule`, `Book now`.
- `CtaBand`.

## Criterios de aceptación

- [x] `dist/pricing/index.html` contiene los 10 planes con sus precios y el h1 `Invest in stronger.`
- [x] No aparece ninguna insignia `Most popular` y todos los botones son `btn-outline`.
- [x] Los 6 botones de Personal dicen `Inquire now` (→ `/contact`) y los 4 restantes `Book now` (→ `/schedule`).
- [x] A 390 px las tarjetas se apilan sin scroll horizontal.
- [x] `bun run lint`, `bun run format:check`, `bun run check`, `bun run test` y `bun run build` pasan en verde.

## Referencias

- `features/002-web-replica-lovable/spec.md`, "Fase 3" → tarea 012.
- `features/002-web-replica-lovable/reference/html/pricing.html`

## Fuera de alcance

- Precios de online coaching (se comunican tras la consulta).

## Notas de implementación

Se verificó el HTML generado y la presentación a 390 px y 1440 px con Chromium.
