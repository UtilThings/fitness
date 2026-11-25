# 005 - [Web] Shell: layout, navegación, cabecera, pie y componentes comunes

- **Prioridad:** 5
- **Estado:** Completado
- **Depende de:** 003, 004
- **Fase:** Fase 2: Shell y utilidades

## Objetivo

El marco del sitio (layout, cabecera, pie, navegación y componentes compartidos) está en inglés con traducción al español, incluidos `aria-label`, `alt` y `<title>`, y reacciona al cambio de idioma.

## Contexto

Tras 004 el puente funciona y las claves antiguas ya usan texto inglés. Quedan textos fijos: `Header.vue` (`aria-label` de logo/menú/«Main menu»/«Mobile menu», `— home`, `logo`), `Footer.astro` (`Boutique personal training & small-group fitness in {city}.`, `Studio`, `© … All rights reserved.`), `PolicyCard.astro` (`Policies`), `PageHero.astro` (`alt=""` decorativo, sin texto), `BaseLayout.astro` (`<html lang="en">`, `<title>`), `lib/navigation.ts`. `business.name` y `business.city` son datos del negocio y se pasan como parámetros sin traducir.

## Alcance

- `BaseLayout.astro`: `<title data-i18n … data-i18n-params …>` aceptando clave + parámetros (las páginas pasan `titleKey`/`titleParams`, o `title` ya en inglés con clave equivalente; definir la firma y migrar las páginas en 008-010); `<html lang="en">` se mantiene como valor inicial.
- `Header.vue`: `aria-label` con `t()` y parámetros (`'{name} — home'`, `'{name} logo'`), `Main menu`, `Mobile menu`, `Menu`; selector de idioma con `aria-label` traducido y textos `EN`/`ES` como excepción documentada (nombres nativos).
- `Footer.astro`, `PolicyCard.astro` (`Policies` por defecto), `CtaBand.astro` y `Section.astro` si aplica: `<T>` con parámetros e `i18nAttrs`.
- `lib/navigation.ts`: claves con `tl()`.
- Agregar claves a `es.json` (ordenadas) y actualizar `Header.test.ts` para verificar ambos idiomas.
- Límites: el contenido de las páginas se migra en 008-010; no se tocan formatos.

## Criterios de aceptación

- [x] `cd web && bun run lint`, `bun run check`, `bun run test` y `bun run build` pasan en verde.
- [x] `bun run i18n:check` en verde.
- [x] Con `en`, cabecera y pie salen idénticos al HTML actual; con `es`, texto y `aria-label` aparecen en español, incluido `© {año} {nombre}. Todos los derechos reservados.`.
- [x] El nombre y la ciudad del negocio no se traducen y se interpolan correctamente.
- [x] El selector marca `aria-pressed` correctamente y cambia el idioma de todo el shell sin recargar.

## Referencias

- `features/022-internacionalizacion-web/spec.md`, «Fase 2» → tarea 005.
- `web/src/components/Header.vue`, `Footer.astro`, `layouts/BaseLayout.astro`.

## Fuera de alcance

- Textos de páginas (008-010) y de `PricingGrid`/`ScheduleBoard`/`LeadForm` (007).

## Notas de implementación

Lint, astro check, pruebas, build, dist e i18n:check aprobados. Chromium verificó ambos idiomas en cabecera y pie, la ciudad Miramar, FL, los derechos de JQ Fitness y el estado aria-pressed sin recarga. Los títulos reciben un descriptor opcional durante la migración de páginas.
