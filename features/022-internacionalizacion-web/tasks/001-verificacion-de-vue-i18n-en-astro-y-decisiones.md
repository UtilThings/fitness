# 001 - [Verificación] vue-i18n en Astro y decisiones de diseño

- **Prioridad:** 1
- **Estado:** Completado
- **Depende de:** Ninguna
- **Fase:** Fase 1: Fundamentos

## Objetivo

Quedan confirmadas, con la versión instalada de `vue-i18n`, las decisiones de diseño del spec (singleton compartido entre islas, `t` en Astro, compilación de mensajes y peso) antes de tocar código de producción.

## Contexto

`web/` es un sitio Astro estático con islas Vue (`Header` y `PricingGrid`, `LeadForm` con `client:load`; `ScheduleBoard` con `client:only="vue"`). Hoy las islas comparten idioma con un `ref` de módulo en `src/lib/use-lang.ts` y un evento `window`. El admin (`app/src/i18n/index.ts`) ya usa `createI18n` con `legacy: false`, `fallbackFormat: true` y carga perezosa; falta confirmar que ese patrón funciona en Astro (SSG + islas) y qué cuesta en bundle.

## Alcance

- Instalar `vue-i18n` en un spike descartable (rama o carpeta temporal; **no** dejar cambios en `web/package.json` aquí) y comprobar:
  1. `t` importado de un módulo singleton: reactivo en dos islas separadas al cambiar `i18n.global.locale.value`, tanto con `client:load` como con `client:only`.
  2. Alternativa `appEntrypoint` de `@astrojs/vue` (instalar el plugin por isla): ¿aporta algo frente al singleton?
  3. `t('texto')` en el frontmatter de un `.astro` durante `astro build` (Node, `locale = en`) y que no use `window`/`localStorage` al importarse.
  4. Compilación de mensajes del JSON en el navegador: build completo vs. precompilación (`@intlify/unplugin-vue-i18n`); tamaño añadido al bundle de las islas y compatibilidad con la CSP de `nginx.conf`.
  5. Claves con `.`, `|`, `@`, `{`, `}`, `$`, `&` y apóstrofe tipográfico como texto-clave; plurales `"{count} class | {count} classes"`; `fallbackFormat`; carga perezosa de `es.json` como chunk.
  6. Hidratación: una isla `client:load` que cambia a `es` en `onMounted` no produce advertencias de desajuste.
- Registrar en «Notas de implementación» cada resultado y la decisión (singleton vs. plugin; build de `vue-i18n`; si se necesita `unplugin-vue-i18n`) y, si algo contradice el spec, actualizar `features/022-internacionalizacion-web/spec.md`.
- Límites: no crear `src/i18n/` definitivo ni migrar texto.

## Criterios de aceptación

- [x] Cada punto 1-6 tiene resultado y decisión documentados en esta tarea.
- [x] Se indica el sobrecoste en KB (gzip) de `vue-i18n` en el bundle de islas y la opción elegida para reducirlo (o por qué no hace falta).
- [x] El spec refleja cualquier ajuste (secciones «Contrato de claves», «Decisiones», «Trampas conocidas»).
- [x] `git status` no muestra cambios en `web/package.json` ni en código de producción.

## Referencias

- `features/022-internacionalizacion-web/spec.md`, «Fase 1» → tarea 001 y «Trampas conocidas».
- `features/021-internacionalizacion-app/tasks/001-verificacion-de-vue-i18n-y-decisiones.md` (hallazgos para reutilizar).
- `app/src/i18n/index.ts`, `web/src/lib/use-lang.ts`, `web/nginx.conf`, `web/astro.config.mjs`.
- https://docs.astro.build/en/guides/integrations-guide/vue/ (`appEntrypoint`).
- https://vue-i18n.intlify.dev/guide/advanced/optimization.html

## Fuera de alcance

- Implementación definitiva del módulo (002) y del puente Astro (004).

## Notas de implementación

Prueba descartable con Astro 7.4.13, Vue 3.5.45, vue-i18n 11.4.16, Node 24.22 y Chromium.

1. Dos islas (`client:load` y `client:only`) cambiaron a «Reserva tu clase» con una sola instancia de módulo al pulsar el botón.
2. Repetir con `vue({ appEntrypoint })` y `app.use(i18n)` produjo el mismo resultado. Se elige el singleton con `t` explícito, también disponible fuera de Vue.
3. `astro build` generó «Hello Ada.» desde el frontmatter con interpolación en inglés. El módulo se importó sin objetos del navegador.
4. Suma de gzip de los JS del spike, con `gzip -cn`: 29,6 kB base, 49,3 kB con compilador (+19,8 kB) y 49,7 kB con `appEntrypoint`. La variante con AST en español y compilador cliente eliminado midió 44,7 kB, pero mostró los plurales y escapes ingleses como texto literal. Con el compilador completo, Chromium tradujo bajo una CSP de prueba con scripts inline permitidos y sin `unsafe-eval`. El Nginx del proyecto no declara CSP. Se conserva el compilador JIT y la carga perezosa, sin agregar el plugin de precompilación.
5. Se verificaron punto, dólar, ampersand, apóstrofe tipográfico y escapes de barra vertical, arroba y llaves. «2 classes» pasó a «2 clases». El navegador pidió el chunk `es.*.js` al cambiar a español y no lo pidió en inglés.
6. El cambio en `onMounted` también actualizó ambas islas. Con el documento UTF-8, Chromium no registró advertencias de hidratación. Cada isla de producción mantendrá inglés hasta montarse, ya que el script de Astro puede elegir español antes de hidratarla.
