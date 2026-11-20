# 017 - [Web] Página `/contact`

- **Prioridad:** 17
- **Estado:** Completado
- **Depende de:** 006, 007, 015
- **Fase:** Fase 4: Páginas interactivas

## Objetivo

`/contact` replica el original: hero, tarjetas de ubicación y programas, y formulario de contacto.

## Contexto

Referencia: `reference/html/contact.html`. Título `Contact JQ Fitness | Miramar, FL`; descripción `Questions about training, classes or packages? Get in touch with JQ Fitness.` Usa `LeadForm` (015) con `client:load`. Es el destino de los CTA de planes, "Reserve", "Join waitlist" y "Ask about intro".

## Alcance

Crear `web/src/pages/contact.astro`:

- `PageHero`: eyebrow `Contact`, título `Let's get started.`, subtítulo `Tell us what you're interested in and we'll help you find the right program.`
- `Section` con clase `grid gap-10 !pt-0 lg:grid-cols-2`:
  - Columna izquierda `space-y-6` con dos `div.card-surface.p-7`: eyebrow `Location` (`mb-2`) con `p.text-xl` `Miramar, Florida`; y eyebrow `Programs` (`mb-2`) con `p.text-muted-foreground` `Personal Training · Group Strength · Tropical Jump · Online Coaching`.
  - Columna derecha: `LeadForm` sin título; campos: texto `Full name` (obligatorio), email `Email` (obligatorio), select con `Personal Training`, `Group Strength`, `Tropical Jump`, `Online Coaching`, `Other`, textarea de 5 filas `Message`; `submitLabel` `Send message`; `successMessage` `Thanks! We'll get back to you shortly.`

## Criterios de aceptación

- [x] `dist/contact/index.html` contiene el h1, las dos tarjetas informativas y el formulario con sus 4 controles.
- [x] Enviar con `Full name` vacío o con un email inválido no envía el formulario; con datos válidos se muestra `Thanks! We'll get back to you shortly.` sin petición de red.
- [x] A 390 px las columnas se apilan (tarjetas arriba, formulario abajo); desde 1024 px son 2 columnas.
- [x] `bun run lint`, `bun run format:check`, `bun run check`, `bun run test` y `bun run build` pasan en verde.

## Referencias

- `features/002-web-replica-lovable/spec.md`, "Fase 4" → tarea 017.
- `features/002-web-replica-lovable/reference/html/contact.html`

## Fuera de alcance

- Envío real del mensaje y datos de contacto adicionales (teléfono, dirección) que el original no tiene.

## Notas de implementación

Chromium comprobó el HTML prerenderizado, las columnas a 390 y 1024 px, la validación nativa y la confirmación sin peticiones.
