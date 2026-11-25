# 011 - [Pruebas] Completitud del catálogo y limpieza

- **Prioridad:** 11
- **Estado:** Completado
- **Depende de:** 008, 009, 010
- **Fase:** Fase final: Verificación y cierre

## Objetivo

No queda texto visible en inglés fuera del sistema de traducción (salvo excepciones documentadas) y `es.json` está limpio, ordenado y sin huérfanas.

## Contexto

Con 004-010 migradas, `i18n:check` garantiza que lo marcado esté traducido, pero no detecta literales sin marcar. Pueden quedar textos en `lib/`, atributos, `aria-label`, `title`/`alt` y mensajes. Excepciones previsibles: nombres de marca/negocio, `EN`/`ES`, símbolos (`•`, `→`, `©`) y contenido del negocio.

## Alcance

- Barrido de literales: buscar texto en inglés en `.astro`, `.vue` y `lib/*.ts` fuera de `t()`, `<T>`, `i18nAttrs`, `tl()` (herramienta: `rg` o una verificación adicional en `i18n-check.ts` con lista de excepciones explícita en el propio script).
- Corregir hallazgos: texto, `aria-label`, `alt`, `placeholder`, `title` y mensajes.
- Revisar `es.json`: sin huérfanas, sin duplicados, claves reutilizadas, tono consistente (tú/usted según el estilo ya usado en `es.json`), variables y plurales coherentes.
- `bun run i18n:sort` e `i18n:check` en verde; documentar las excepciones en `docs/i18n-web.md` (013).
- Límites: no se agregan funcionalidades.

## Criterios de aceptación

- [x] `cd web && bun run lint`, `bun run check`, `bun run test` y `bun run build` pasan en verde.
- [x] `bun run i18n:check` en verde, incluido el barrido de literales con excepciones explícitas.
- [x] Recorrido manual de las 10 páginas en `es`: sin texto en inglés salvo contenido del negocio y excepciones listadas.

## Referencias

- `features/022-internacionalizacion-web/spec.md`, «Fase final» → tarea 011.
- `web/scripts/i18n-check.ts`, `web/src/i18n/locales/es.json`.

## Fuera de alcance

- Pruebas nuevas (012) y documentación (013).

## Notas de implementación

Lint, astro check, pruebas, build, dist e i18n:check aprobados. El verificador detecta texto directo y atributos de interfaz sin marcar en Astro y Vue, y compara las variables de cada variante plural. El barrido de lib confirmó que los textos generados se marcan como descriptores. Se recorrieron las diez páginas en Chromium con es-MX, incluido menú móvil, horarios de respaldo, formularios y 404. Excepciones verificadas: EN/ES, marcas y nombres comerciales, ciudad, datos del API, alt decorativo vacío, numerales y símbolos; los metadatos de buscadores siguen en inglés.
