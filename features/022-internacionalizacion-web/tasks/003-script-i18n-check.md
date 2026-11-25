# 003 - [Pruebas] Script `i18n:check` de claves faltantes y huérfanas

- **Prioridad:** 3
- **Estado:** Completado
- **Depende de:** 002
- **Fase:** Fase 1: Fundamentos

## Objetivo

Existe un comando que falla cuando `es.json` no coincide con las claves usadas en `web/src`, dado que `missingWarn` está desactivado y las claves son texto.

## Contexto

Con texto como clave, una traducción ausente no da error (se ve en inglés). Es la red de seguridad de toda la migración. Referencia directa: `app/scripts/i18n-check.ts` (feature 021, tarea 005), pero `web/` también tiene archivos `.astro` y usa `<T k="…">`, `i18nAttrs({…})` y `data-i18n="…"`. Se ejecuta con bun como los demás scripts.

## Alcance

- Crear `web/scripts/i18n-check.ts`: recorre `src/**/*.{astro,vue,ts}` (excluye `*.test.ts`) y extrae claves literales de `t('…')`, `te('…')`, `tl('…')`, `<T k="…">`, `keypath="…"`, valores de `i18nAttrs({ … })` y `data-i18n[-attr]="…"` en `.astro`/`.vue`.
- Compara con `src/i18n/locales/es.json`; falla por: (a) clave usada sin traducción, (b) clave huérfana, (c) clave duplicada o `es.json` sin ordenar, (d) variables `{x}` distintas entre clave y traducción (y plurales con distinto número de variantes), (e) llamada a `t()`/`<T k>` con argumento no literal.
- Los mensajes de error indican archivo y clave. Salida con código distinto de cero.
- Añadir a `web/package.json` los scripts `"i18n:check"` y `"i18n:sort"` (ordena `es.json` de forma estable e idempotente).
- Pruebas: `web/scripts/i18n-check.test.ts` con fixtures mínimos para cada tipo de fallo, y uno por cada forma de extracción (`.astro`, `.vue`, `.ts`). Incluir el script en `tsconfig`/ESLint si hace falta (`eslint .` lo recorre).
- Por ahora solo informa del catálogo inicial: las páginas se migran en 004-010.

## Criterios de aceptación

- [x] `cd web && bun run lint`, `bun run check` y `bun run test` pasan en verde (el script no rompe `astro check`).
- [x] `bun run i18n:check` en verde con el catálogo de 002 y en rojo ante cada fixture de fallo, con mensaje que indica archivo y clave.
- [x] `bun run i18n:sort` es idempotente.

## Referencias

- `features/022-internacionalizacion-web/spec.md`, «Contrato de claves y uso» y «Fase 1» → tarea 003.
- `app/scripts/i18n-check.ts` y `app/scripts/i18n-check.test.ts`.

## Fuera de alcance

- Integración con `scripts/verify-web.sh` (013).
- Barrido de literales en inglés sin marcar (011).

## Notas de implementación

Pasaron lint, astro check y 74 pruebas. Los casos de error incluyen rutas y claves; dos ejecuciones del ordenamiento conservaron el hash. Hasta sustituir los consumidores en 004, el verificador toma como claves iniciales los textos del diccionario inglés antiguo.
