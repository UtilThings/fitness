# 013 - [Docs] Documentación y verificación

- **Prioridad:** 13
- **Estado:** Completado
- **Depende de:** 001, 002, 003, 004, 005, 006, 007, 008, 009, 010, 011, 012
- **Fase:** Fase final: Verificación y cierre

## Objetivo

Existe documentación para agregar texto e idiomas en `web/`, `scripts/verify-web.sh` ejecuta `i18n:check`, y el spec queda cerrado con su verificación.

## Contexto

`docs/i18n.md` documenta el admin (feature 021); `web/README.md` y `scripts/verify-web.sh` (lint, Prettier, `astro check`, pruebas, build, `test:dist`, `test:build:offline`, chequeo de referencias) no mencionan i18n.

## Alcance

- Crear `docs/i18n-web.md`: convención de claves (texto inglés, `es.json` plano), cómo agregar texto en cada capa (`t`, `<T>`, `i18nAttrs`, `tl()`, `<title>`), descriptores de texto del catálogo y qué no se traduce (contenido del negocio), formatos, desambiguación de claves, excepciones del barrido de literales, cómo agregar un idioma, flujo de verificación (`i18n:check`, `i18n:sort`) y limitaciones conocidas (parpadeo inicial, metaetiquetas solo en inglés, sin rutas por idioma).
- Añadir una sección breve a `web/README.md` y un enlace desde `docs/i18n.md`.
- `scripts/verify-web.sh`: nuevo paso `run_step bun run i18n:check` antes del build.
- Completar «Verificación de cierre» y marcar los criterios de aceptación y el estado del spec (`Completado`) tras ejecutar la validación post-deploy.
- Límites: sin cambios de código de producción.

## Criterios de aceptación

- [x] `docs/i18n-web.md` existe y describe cada capa con un ejemplo.
- [x] `bash scripts/verify-web.sh` termina en verde e incluye `i18n:check`.
- [x] `cd web && bun run lint`, `format:check`, `check`, `test` y `build` en verde.
- [x] `features/022-internacionalizacion-web/spec.md` tiene los criterios marcados y la sección «Verificación de cierre».

## Referencias

- `features/022-internacionalizacion-web/spec.md`, «Criterios de Aceptación» y «Validación Post-Deploy».
- `docs/i18n.md`, `scripts/verify-web.sh`, `web/README.md`.

## Fuera de alcance

- Cambios en `app/` o `api/`.

## Notas de implementación

Guía web, enlaces en README y en la guía del admin, e i18n:check en verify-web.sh. El script completó todos sus pasos. Se compararon las diez páginas con el HTML inglés original y se verificó el comportamiento en Chromium con respaldo y con API local simulada. Los nueve criterios y el estado del spec quedaron actualizados.
