# 002 - [Módulo] Módulo `i18n` e instalación de vue-i18n

- **Prioridad:** 2
- **Estado:** Completado
- **Depende de:** 001
- **Fase:** Fase 1: Fundamentos

## Objetivo

El app arranca con `vue-i18n` instalado, idioma inicial resuelto y `t` disponible en componentes y fuera de ellos; con `en` el texto-clave se muestra sin catálogo.

## Contexto

`app/src/main.ts` monta `App` con PrimeVue, router, Toast y Confirmation. El borrador de referencia (`index.ts`, `locales/es.json`) usa `createI18n` con `legacy: false`, `fallbackFormat: true` y carga `es` bajo demanda. La moneda viene del `business` (`lib/business-session.ts`), por lo que no se define moneda por idioma.

## Alcance

- Ejecutar `bun add vue-i18n` en `app/` (actualiza `package.json` y `bun.lock`).
- Crear `app/src/i18n/index.ts`: `supportedLocales`, tipo `Locale`, `resolveLocale` (`localStorage` → `navigator.language` → `en`, tolerante a `localStorage` no disponible), `i18n`, `setLocale`, `initializeLocale`, y exportar `t` y `te` ligados a `i18n.global`. Sin `numberFormats` de moneda fija; `datetimeFormats` solo si 006 lo necesita.
- Crear `app/src/i18n/locales/es.json` con las claves del borrador de navegación (`Settings`, `Sign out`, `Dashboard`, …), ordenadas alfabéticamente.
- Modificar `app/src/main.ts`: `await initializeLocale()` antes de `.mount`, y `.use(i18n)`.
- Pruebas: `app/src/i18n/index.test.ts` (resolución de idioma, normalización de `es-MX`, valor inválido → `en`, carga perezosa de `es`, texto-clave en `en`, `t` fuera de componente).
- No migra texto de ninguna vista.

## Criterios de aceptación

- [x] `cd app && bun run lint`, `bun run typecheck` `bun run test` y `bun run build` pasan en verde.
- [x] Con `localStorage.locale = "es"` `t('Sign out')` devuelve `Cerrar sesión`; con `en` o sin valor devuelve `Sign out`.
- [x] Un valor inválido en `localStorage` o `navigator.language = "fr"` resuelve a `en`.
- [x] El chunk de `es` se genera aparte en `vite build`.

## Referencias

- `features/021-internacionalizacion-app/spec.md`, sección «Fase 1» → tarea 002.
- https://vue-i18n.intlify.dev/guide/installation.html

## Fuera de alcance

- Selector de idioma y PrimeVue locale (004); formatos (006).

## Notas de implementación

Lint, comprobación de tipos, build y 334 pruebas en verde. Vite generó el chunk independiente es-Bmxdhq2e.js. La suite completa se ejecutó fuera del sandbox para permitir la tubería de la prueba de CSV.
