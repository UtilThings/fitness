# 008 - [Web] Páginas de inicio y Nosotros

- **Prioridad:** 8
- **Estado:** Completado
- **Depende de:** 005
- **Fase:** Fase 3: Migración de páginas

## Objetivo

`/` y `/about` están en inglés con traducción al español (texto, `alt` y `<title>`), sin cambiar el HTML en inglés.

## Contexto

- `pages/index.astro`: hero (ya usa `<T>` para título, subtítulo y CTAs), programas (`sub` en inglés), ticker `words` (`Strength`, `Energy`…), `Train your way.`, tarjeta de coaching (`8–16 week programs …`, `Apply`), `stats` (`Max per strength class`, …), `alt` con `business.name`, `title`/`description` con `business.name` y `business.city`.
- `pages/about.astro`: `values` (título y descripción), `PageHero` con `eyebrow`, `title`, `sub` con `business.name`/`city`; `title` con `business.city.split(',')[0]`.
- `PageHero.astro` recibe `eyebrow`, `title`, `sub` como strings: debe aceptar claves (o usar slots con `<T>`); definir el patrón en esta tarea y aplicarlo igual en 009-010.
- `business.name` y `city` se interpolan como parámetros, sin traducir.

## Alcance

- Definir cómo reciben texto los componentes de página (`PageHero`: props `eyebrow/title/sub` + `params`, que renderizan `<T>`) y migrar sus usos de estas dos páginas.
- `index.astro` y `about.astro`: envolver todo el texto visible con `<T>`/`t()`/`tl()`; `alt` con `i18nAttrs`; `title` traducible con parámetros (`{name}`, `{city}`); ticker y estadísticas con listas de claves `tl()`.
- Agregar claves a `es.json` ordenadas; `bun run i18n:sort`.
- Pruebas: extender `tests/dist/routes.test.ts` solo si hace falta para afirmar que `data-i18n` está presente; sin cambios en los textos ingleses esperados.

## Criterios de aceptación

- [x] `cd web && bun run lint`, `bun run check`, `bun run test`, `bun run build` y `bun run test:dist` pasan en verde.
- [x] `bun run i18n:check` en verde.
- [x] En `en` las páginas son idénticas al HTML actual; en `es` todo el texto visible, `alt` y título aparecen en español con el nombre y la ciudad del negocio intactos.
- [x] El selector de idioma las actualiza sin recargar.

## Referencias

- `features/022-internacionalizacion-web/spec.md`, «Fase 3» → tarea 008.
- `web/src/pages/index.astro`, `about.astro`, `components/PageHero.astro`.

## Fuera de alcance

- Resto de páginas (009, 010).

## Notas de implementación

Pasaron lint, astro check, pruebas, build, dist e i18n:check. Comparados con el build original, Inicio y Nosotros conservan texto, título y alt en inglés. Chromium verificó títulos, contenido, alt de Inicio y cambio sin recarga, con el nombre y la ciudad intactos. La imagen decorativa de Nosotros conserva su alt vacío.
