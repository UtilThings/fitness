# 004 - [Módulo] Puente Astro ↔ cliente y `useLang` sobre vue-i18n

- **Prioridad:** 4
- **Estado:** Completado
- **Depende de:** 002, 003
- **Fase:** Fase 1: Fundamentos

## Objetivo

El texto estático de Astro y las islas Vue comparten una sola fuente de traducciones (`vue-i18n`), el diccionario camelCase antiguo desaparece y el cambio de idioma sigue siendo instantáneo y sin recargar.

## Contexto

- `components/T.astro` renderiza `<span data-i18n="<clave>">` en inglés; `scripts/i18n-client.ts` reemplaza `textContent` usando `dictionary` de `lib/i18n.ts`; `lib/use-lang.ts` expone `lang`, `setLang`, `t(key)` y sincroniza islas con `jq-lang-change`.
- Consumidores actuales de claves camelCase: `Header.vue`, `lib/navigation.ts`, `Footer.astro`, `CtaBand.astro`, `pages/index.astro`, `pages/schedule.astro`, `ScheduleBoard.vue` y `lib/i18n.test.ts`.
- Atributos (`alt`, `aria-label`, `placeholder`) y `<title>` no tienen hoy mecanismo de traducción.
- Esta tarea es mecánica en el re-clavado: **no agrega texto nuevo**, solo cambia de clave camelCase a texto inglés (ya presente en `es.json` desde 002).

## Alcance

- Reescribir `components/T.astro`: props `k` (texto inglés literal) y `params?`; renderiza `<span data-i18n={k} data-i18n-params={JSON.stringify(params)}>` con el texto inglés ya interpolado (usa `t` con `locale = en`).
- Crear `src/i18n/attrs.ts` con `i18nAttrs(attrs)` que devuelve, para cada atributo traducible, el valor inglés y `data-i18n-<attr>` (+ `data-i18n-params-<attr>` si hay parámetros); admitir `<title data-i18n>` y `<html lang>`.
- Reescribir `scripts/i18n-client.ts`: al cargar resuelve el idioma (`initializeLocale`), carga `es` si hace falta y aplica traducciones a `[data-i18n]`, `[data-i18n-*]`, `document.title` y `<html lang>`; escucha `LANG_EVENT`. Usa `textContent`/`setAttribute` (nunca `innerHTML`); `JSON.parse` de parámetros protegido con `try/catch`; clave desconocida deja el texto como está.
- Reescribir `lib/use-lang.ts` con la misma API pública (`lang`, `setLang`, `t`, `initLang`) sobre `@/i18n`: `setLang` persiste, llama a `setLocale` y emite `LANG_EVENT`; `initLang` en `onMounted` (las islas `client:load` hidratan primero en `en`).
- Re-clavear los consumidores listados al texto inglés (p. ej. `t('book')` → `t('Book your class')`, `navigation.key` pasa a clave inglesa con `tl()`), y **eliminar** el diccionario y `translate`/`Key` de `lib/i18n.ts` (conservar solo lo que 002 no cubra o borrar el archivo).
- Pruebas: reescribir `lib/i18n.test.ts` → pruebas del puente (texto con y sin parámetros, atributo, `<title>`, `<html lang>`, clave desconocida, parámetros inválidos, `localStorage` bloqueado); mantener `Header.test.ts` y `ScheduleBoard.test.ts` en verde.

## Criterios de aceptación

- [x] `cd web && bun run lint`, `bun run check`, `bun run test` y `bun run build` pasan en verde.
- [x] `bun run i18n:check` pasa en verde (sin claves faltantes ni huérfanas).
- [x] `rg "dictionary\.(en|es)|translate\(" web/src` no devuelve resultados.
- [x] En el build, el HTML sigue en inglés idéntico al anterior (`bun run test:dist` en verde).
- [x] En el navegador, el cambio EN/ES actualiza el texto estático de Astro y el de las islas al instante.

## Referencias

- `features/022-internacionalizacion-web/spec.md`, «Cómo se usa en cada capa» y «Fase 1» → tarea 004.
- `web/src/lib/use-lang.ts`, `web/src/scripts/i18n-client.ts`, `web/src/components/T.astro`.
- https://docs.astro.build/en/guides/client-side-scripts/

## Fuera de alcance

- Migrar texto nuevo (005-010); formatos (006).

## Notas de implementación

Lint, astro check, 70 pruebas, build, 17 pruebas de dist e i18n:check aprobados. Chromium verificó cambio de texto estático y de las islas sin navegación, persistencia al recargar, detección de es-MX y ausencia de avisos de hidratación. Se retiraron cuatro claves sin consumidores; las que correspondan a páginas volverán al migrarlas.
