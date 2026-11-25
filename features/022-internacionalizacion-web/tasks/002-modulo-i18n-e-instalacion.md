# 002 - [Módulo] Módulo `src/i18n/` e instalación de vue-i18n

- **Prioridad:** 2
- **Estado:** Completado
- **Depende de:** 001
- **Fase:** Fase 1: Fundamentos

## Objetivo

Existe un módulo `web/src/i18n/` con la instancia de `vue-i18n`, el catálogo `es.json` inicial y la detección/persistencia del idioma, utilizable en Vue, `lib/` y el frontmatter de Astro sin romper el build.

## Contexto

Hoy el idioma vive en `src/lib/i18n.ts` (`STORAGE_KEY = 'jq-lang'`, `LANG_EVENT = 'jq-lang-change'`, `readStoredLang`, `storeLang`, diccionario de 35 claves camelCase). El admin tiene un `index.ts` de referencia (`app/src/i18n/index.ts`) que toca `localStorage` y `navigator` al importarse: en `web/` eso rompe el build de Astro (Node), así que el acceso debe ocurrir dentro de funciones. Aplican las decisiones registradas en la tarea 001.

## Alcance

- `bun add vue-i18n` (más lo que decida 001, p. ej. `@intlify/unplugin-vue-i18n` y su registro en `astro.config.mjs`).
- Crear `web/src/i18n/index.ts` con: `supportedLocales`, `type Locale`, `resolveLocale(value)` (`es*` → `es`, otro → `en`), `i18n` (`createI18n`, `legacy: false`, `locale: 'en'`, `fallbackLocale: 'en'`, `fallbackFormat: true`, `missingWarn: false`, `fallbackWarn: false`), `t` exportado, `tl` (identidad tipada para el extractor), `setLocale(locale)` (carga perezosa de `es.json`, actualiza `document.documentElement.lang` y guarda en `localStorage["jq-lang"]` solo cuando se invoca explícitamente), `initializeLocale()` (`jq-lang` → `navigator.language` → `en`), y reexporta `LANG_EVENT`/`STORAGE_KEY`.
- Crear `web/src/i18n/locales/es.json` plano y ordenado con las 35 claves actuales **re-escritas con el texto inglés como clave** (p. ej. `"Book your class": "Reserva tu clase"`).
- Todo acceso a `window`, `document`, `localStorage` y `navigator` dentro de funciones con guarda `typeof window !== 'undefined'`; `localStorage` bloqueado no lanza (`try/catch`, como `readStoredLang`).
- Pruebas: `web/src/i18n/index.test.ts`: `resolveLocale`, detección (`jq-lang` gana a `navigator.language`), persistencia, carga perezosa de `es`, claves faltantes caen al texto inglés, importar el módulo sin `window` no lanza.
- Límites: no modificar consumidores todavía (004); `src/lib/i18n.ts` queda intacto hasta 004.

## Criterios de aceptación

- [x] `cd web && bun run lint`, `bun run check` y `bun run test` pasan en verde.
- [x] `bun run build` sigue en verde (el módulo no se usa aún, pero se compila sin tocar `window` en Node).
- [x] `t('Book your class')` devuelve `Reserva tu clase` con `es` y el mismo texto con `en`; una clave ausente devuelve la clave.
- [x] `es.json` carga como chunk perezoso (no entra en el bundle inicial).
- [x] Con `localStorage` bloqueado, `initializeLocale()` no lanza.

## Referencias

- `features/022-internacionalizacion-web/spec.md`, «Contrato de claves y uso» y «Fase 1» → tarea 002.
- `app/src/i18n/index.ts`, `web/src/lib/i18n.ts`.
- https://vue-i18n.intlify.dev/guide/essentials/started.html

## Fuera de alcance

- Puente para texto de Astro y `useLang` (004); `i18n:check` (003); formatos (006).

## Notas de implementación

Lint, astro check, 68 pruebas y build estático aprobados. El catálogo inicial conserva los 32 pares del diccionario real; la cifra de 35 del plan era aproximada. La separación del chunk quedó comprobada en 001 y la importación dinámica se mantiene en el módulo.
