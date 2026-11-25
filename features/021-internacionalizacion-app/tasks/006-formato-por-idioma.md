# 006 - [Módulo] Formato de fechas, números, moneda y ordenamiento por idioma

- **Prioridad:** 6
- **Estado:** Completado
- **Depende de:** 002, 003
- **Fase:** Fase 2: Utilidades transversales

## Objetivo

Fechas, horas, números y comparaciones de texto usan el idioma activo mientras la moneda y la zona horaria siguen siendo las del `business`.

## Contexto

`lib/datetime.ts` fija `es-US` (solo `formatTime` admite `en-US`); `lib/money.ts` fija `en-US`; `components/reports/report-presentation.ts` y `chart-data.ts` usan `es-US`; `components/coaching/AdherenceBadge.vue` usa `es`; `CoachingView.vue` y `ProgramFormDialog.vue` usan `localeCompare(…, 'es')`. `businessTimezone`/`businessCurrency` viven en `lib/business-session.ts`.

## Alcance

- Crear `app/src/i18n/formats.ts` con `intlLocale()` (`es` → `es-US`, `en` → `en-US`) y `collator()` reactivo al idioma.
- Modificar `lib/datetime.ts`: los formateadores son `computed` que dependen de `intlLocale()`; `partsFormatter` mantiene `en-US` (se usa para cálculo, no para mostrar); el parámetro `locale` de `formatTime` pasa a ser opcional y por defecto el activo. Mensajes de `RangeError` en inglés.
- Modificar `lib/money.ts`: `moneyFormatter` clave por (moneda, locale); mensajes de error en inglés; `parseToCents` conserva su tolerancia a `1,234.56` y `1.234,56` en ambos idiomas.
- Modificar `report-presentation.ts`, `chart-data.ts`, `AdherenceBadge.vue`, `CoachingView.vue` y `ProgramFormDialog.vue` para usar `intlLocale()`/`collator()`.
- Pruebas: actualizar `datetime.test.ts`, `money.test.ts` y pruebas de reportes con casos en `es` y `en` (mismo instante, misma zona).
- No traduce textos; los literales de `report-presentation.ts` se migran en 017.

## Criterios de aceptación

- [x] `cd app && bun run lint`, `bun run typecheck` y `bun run test` pasan en verde.
- [x] Con `en`, `formatDate` y `formatMoney` producen el formato de `en-US`; con `es`, el actual.
- [x] Cambiar el idioma en caliente actualiza fechas y montos mostrados (los formateadores son reactivos).
- [x] La zona horaria y la moneda siguen saliendo del `business` en ambos idiomas.
- [x] Los cálculos (`localToUtcIso`, `todayLocal`) no cambian con el idioma.

## Referencias

- `app/src/lib/datetime.ts`, `app/src/lib/money.ts`
- https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Intl

## Fuera de alcance

- Textos de reportes (017).

## Notas de implementación

Lint, comprobación de tipos y suite completa en verde. Los casos nuevos cubren reactividad de fecha, hora y monto en ambos idiomas, los formatos de reportes y los cálculos de horario de Nueva York. La vista Clases muestra las horas en el idioma activo.
