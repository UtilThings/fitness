# 006 - [Módulo] Formato por idioma y datos del catálogo

- **Prioridad:** 6
- **Estado:** Completado
- **Depende de:** 005
- **Fase:** Fase 2: Shell y utilidades

## Objetivo

Los textos que `lib/` compone (unidades, conteos, notas de respaldo) y los formatos de precio, hora, día y rango de fechas dependen del idioma activo, sin traducir lo que escribe el negocio.

## Contexto

- `lib/data.ts`: `Plan { name, price, unit, sessions, freq, note? }` como strings en inglés; `personalPlan()` genera `name: '2x / week'`, `unit: 'per 4 weeks'`, `sessions: '8 sessions'`; `formatPrice` devuelve `'FREE'` y usa `en-US`.
- `lib/catalog.ts#toPlans` compone los mismos textos desde el API (`plural()`, `per 4 weeks`, `New clients only`, `Requires a N-week commitment (…)`); `plan.name` y `plan.note` vienen del negocio. `formatLocalTime` produce `9:00 AM`; `timeOrder` parsea ese formato.
- `lib/schedule.ts`: `formatRange(start, end, locale)`; `weekDays`.
- `PricingGrid` y `ScheduleBoard` consumen estos datos; `getCatalog()` se comparte entre islas y se resuelve una vez, por eso el texto debe resolverse al renderizar.

## Alcance

- Definir `Text = string | { key: string; params?: Record<string, string | number> }` y `resolveText(text, t)` en `src/i18n/` (o `lib/`); `string` plano se devuelve sin traducir.
- `data.ts`: `Plan.unit/sessions/freq/note` pasan a `Text`; el respaldo estático usa descriptores con `tl()`; plurales con `"{count} class | {count} classes"`/`"{count} session | {count} sessions"`; `name` de planes y servicios de respaldo es clave del catálogo (traducible) y `name` del API se muestra tal cual (helper `tr(name)` = `te(name) ? t(name) : name`).
- `catalog.ts#toPlans`: devolver descriptores en lugar de strings compuestos; la `note` del negocio (`plan.note`) sigue siendo `string`. `formatLocalTime`/`timeOrder`: conservar la hora canónica `HH:mm` hasta el renderizado y ordenar por minutos del día, no por el texto.
- `formatPrice(price, currency, locale)`: `Free` traducible en lugar de `FREE`; formato de número según `en-US`/`es-US` con la moneda del `business`.
- Nuevo `formatTime(time, locale)`: 12 h en `en`, 24 h en `es` (decisión del spec); `formatRange` y nombres de día (`Intl.DateTimeFormat` por idioma o claves `tl('Sunday')`…).
- Pruebas: actualizar `data.test.ts`, `catalog.test.ts`, `schedule.test.ts` y `contract.test.ts` (mismos resultados en `en`); casos en `es`: plurales (0, 1, n), `Free`, hora 24 h, moneda del negocio, nombre del negocio intacto.
- Límites: sin cambios en los componentes (007) ni en páginas (009-010) más allá de lo que obligue el cambio de tipo; si un consumidor no compila, adaptar con la mínima conversión `resolveText`.

## Criterios de aceptación

- [x] `cd web && bun run lint`, `bun run check`, `bun run test` y `bun run build` pasan en verde.
- [x] `bun run i18n:check` en verde.
- [x] Con `en` las salidas de `toPlans` y de respaldo equivalen a los textos actuales tras resolver los descriptores.
- [x] Con `es`: `{count}` plural correcto («1 clase», «8 clases»), `Gratis`, `09:00`, moneda y zona del `business` sin cambios.
- [x] `plan.name` y `plan.note` del API pasan intactos.
- [x] `tests/dist/routes.test.ts` sigue en verde (el build en inglés no cambia).

## Referencias

- `features/022-internacionalizacion-web/spec.md`, «Datos del catálogo» y «Fase 2» → tarea 006.
- `web/src/lib/data.ts`, `catalog.ts`, `schedule.ts`; `app/src/i18n/formats.ts` (criterio de formato del admin).
- https://vue-i18n.intlify.dev/guide/essentials/pluralization.html

## Fuera de alcance

- Render de los descriptores en `PricingGrid` y `ScheduleBoard` (007).

## Notas de implementación

Pasaron lint, astro check, 72 pruebas, build, 17 pruebas de dist e i18n:check. Las pruebas verifican las salidas en inglés, plurales 0/1/8, COP en es-US, horas 12/24 h y nombres/notas intactos incluso si coinciden con una clave. «Free» conserva la presentación visual «FREE» con CSS. Los consumidores se adaptaron al nuevo tipo y a la hora canónica.
