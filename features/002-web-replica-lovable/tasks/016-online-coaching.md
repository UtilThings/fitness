# 016 - [Web] Página `/online-coaching`

- **Prioridad:** 16
- **Estado:** Completado
- **Depende de:** 006, 007, 015
- **Fase:** Fase 4: Páginas interactivas

## Objetivo

`/online-coaching` replica el original: hero, cuatro tarjetas de beneficios y formulario de solicitud de consulta.

## Contexto

Referencia: `reference/html/online-coaching.html`. Título `Online Coaching Programs | JQ Fitness`; descripción `Personalized 8–16 week online coaching with training plans, nutrition guidance and progress monitoring.` Usa `LeadForm` (015) con `client:load`. Este original no tiene banda CTA ni imagen en el hero.

## Alcance

Crear `web/src/pages/online-coaching.astro`:

- `PageHero`: eyebrow `Online Coaching`, título `Coaching anywhere.`, subtítulo `Get JQ Fitness programming and accountability wherever you are. Start with a free consultation.`
- `Section` con clase `grid gap-10 lg:grid-cols-2`:
  - Columna izquierda `grid gap-4 sm:grid-cols-2` con 4 `div.card-surface.p-6` (`h3.text-2xl.text-primary` y `p.mt-2.text-sm.text-muted-foreground`): `Training plans` — `Custom programming you can follow at home or in any gym.`; `Nutrition guidance` — `Practical habits and targets that fit your lifestyle.`; `8–16 week programs` — `Structured phases with a clear finish line.`; `Progress monitoring` — `Regular check-ins and adjustments.`; y `p.text-sm.text-muted-foreground.sm:col-span-2` `Program pricing is shared after your consultation.`
  - Columna derecha: `LeadForm` con `title` `Request a consultation`; campos: texto `Full name` (obligatorio), email `Email` (obligatorio), texto `Phone` (opcional), select con `8-week program`, `12-week program`, `16-week program`, `Not sure yet`, textarea de 4 filas `Tell us about your goals`; `submitLabel` `Submit application`; `successMessage` `Thanks! We'll be in touch within 1–2 business days.`

## Criterios de aceptación

- [x] `dist/online-coaching/index.html` contiene el h1, las 4 tarjetas y el texto de precios tras la consulta.
- [x] El formulario tiene 3 campos de texto/email (solo `Phone` opcional), un select de 4 opciones y un textarea; con campos vacíos no se envía.
- [x] Con nombre y email válidos, se muestra `Thanks! We'll be in touch within 1–2 business days.` y no hay petición de red.
- [x] A 390 px las tarjetas pasan a 1 columna y el formulario queda debajo; desde `lg` (1024 px) son 2 columnas.
- [x] `bun run lint`, `bun run format:check`, `bun run check`, `bun run test` y `bun run build` pasan en verde.

## Referencias

- `features/002-web-replica-lovable/spec.md`, "Fase 4" → tarea 016.
- `features/002-web-replica-lovable/reference/html/online-coaching.html`

## Fuera de alcance

- Envío real de la solicitud.

## Notas de implementación

Chromium comprobó el HTML prerenderizado, las columnas a 390 y 1024 px, la validación nativa y la confirmación sin peticiones.
