# 009 - [Web] Páginas de programas

- **Prioridad:** 9
- **Estado:** Completado
- **Depende de:** 006, 007, 008
- **Fase:** Fase 3: Migración de páginas

## Objetivo

Las cuatro páginas de programas están en inglés con traducción al español, incluidos días y horarios por idioma, sin cambiar el HTML en inglés.

## Contexto

- `personal-training.astro`: hero, `policies` y `included` como arrays de strings, `PricingGrid` con `cta="Request a schedule"`, títulos `One-on-one` y `Partner training`.
- `group-strength-training.astro`: `days` en inglés (índice = `getDay()`), agrupa `classTemplates` por horas (`time` ya formateada con `formatLocalTime`) y las muestra; `policies`; tarjeta `Drop-in & Intro`, `Ask about intro`, `Weekly schedule`.
- `tropical-jump.astro` y `online-coaching.astro` (hero, `benefits`, `LeadForm` con `fields`, `submitLabel`, `successMessage`).
- Patrón de `PageHero` y `PolicyCard` definido en 008/005; `LeadForm`, `PricingGrid` listos tras 007; formatos de hora y días tras 006.

## Alcance

- Migrar los textos con `<T>`/`t()`/`tl()`; arrays de políticas, incluidos y beneficios como listas de claves con `tl()` que se renderizan con `<T>` (o descriptores).
- `group-strength-training.astro`: nombres de día por clave `tl('Sunday')`…; el agrupado usa la hora canónica `HH:mm` y se formatea al renderizar con el idioma activo (la hora debe cambiar con el selector sin recargar); `A & B` de días con claves (`'{a} & {b}'` o lista).
- Props de `LeadForm` (`fields`, `submitLabel`, `successMessage`) con claves inglesas que la isla traduce (007).
- Agregar claves a `es.json`; `bun run i18n:sort`.

## Criterios de aceptación

- [x] `cd web && bun run lint`, `bun run check`, `bun run test`, `bun run build` y `bun run test:dist` pasan en verde.
- [x] `bun run i18n:check` en verde.
- [x] En `en` las cuatro páginas equivalen al HTML actual; en `es` todo el texto, días y horas (24 h) salen en español.
- [x] Las horas de `group-strength-training` cambian de formato al cambiar de idioma sin recargar; los nombres de plan y nota del API no se alteran.
- [x] El formulario de `online-coaching` muestra placeholders, opciones y mensaje de éxito en el idioma activo.

## Referencias

- `features/022-internacionalizacion-web/spec.md`, «Fase 3» → tarea 009.
- `web/src/pages/personal-training.astro`, `group-strength-training.astro`, `tropical-jump.astro`, `online-coaching.astro`.

## Fuera de alcance

- Precios, horario, contacto y 404 (010).

## Notas de implementación

Pasaron lint, astro check, pruebas, build, dist e i18n:check. Las cuatro páginas conservan texto, título y alt del build inglés. Chromium verificó días traducidos, cambios 9:00 AM ↔ 09:00 sin recarga y opciones, placeholders y confirmación del formulario. Las pruebas del catálogo y PricingGrid cubren nombres y notas del API.
