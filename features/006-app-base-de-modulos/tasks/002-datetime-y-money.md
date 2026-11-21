# 002 - [Lib] Utilidades de fecha (America/New_York) y dinero (USD)

- **Prioridad:** 2
- **Estado:** Pendiente
- **Depende de:** Ninguna
- **Fase:** Fase 1

## Objetivo

La app dispone de funciones únicas y probadas para mostrar fechas en hora de Miramar y dinero en USD a partir de UTC y centavos.

## Contexto

El negocio opera en `America/New_York`; la API guarda fechas en UTC y dinero en enteros `*_cents`. Los navegadores tienen `Intl` fiable. El servidor usa `api/src/lib/tz.ts` (feature 005) sin `Intl`; ambos deben dar los mismos resultados en los casos límite (domingo de marzo y de noviembre).

## Alcance

- Crear `app/src/lib/datetime.ts`: constante `BUSINESS_TZ`, `formatDate(iso)`, `formatTime(iso)`, `formatDateTime(iso)` (locale `es-US`, 12 h con «a. m./p. m.» según `Intl`), `utcToLocalParts(iso)` → `{ date: "YYYY-MM-DD", time: "HH:mm", weekday: 0-6 }`, `localToUtcIso(date, time)` (obtiene el offset de la zona con `Intl.DateTimeFormat` y `formatToParts`; hora inexistente se mueve una hora adelante, ambigua usa la primera ocurrencia) y `todayLocal()`.
- Crear `app/src/lib/money.ts`: `formatUsd(cents)`, `centsToDecimal(cents)` (string `"12.34"`), `parseUsdToCents(text)` (acepta `$`, comas y espacios; `null` si es inválido o tiene más de 2 decimales). Solo aritmética entera.
- Pruebas `datetime.test.ts` y `money.test.ts`: 2026-03-08 y 2026-11-01 (cambios), 02:30 inexistente, 01:30 ambigua, ida y vuelta local↔UTC, medianoche, centavos 0/1/99/100/123456, entradas inválidas, no negativos salvo que se indique.

## Criterios de aceptación

- [ ] `bun run test` pasa con los casos de límite indicados.
- [ ] Las pruebas no dependen de la zona del equipo (se ejecutan igual con `TZ=UTC` y `TZ=Asia/Tokyo`).
- [ ] `bun run typecheck`, `lint` y `format:check` pasan.

## Referencias

- `features/006-app-base-de-modulos/spec.md`, sección "Fase 1" → tarea 002.
- `features/005-api-fundamentos-roles-y-auditoria/spec.md`, tarea 006 (helper del servidor).
- https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat

## Fuera de alcance

- Uso en vistas concretas (cada módulo).
- Conversión del servidor (feature 005).

## Notas de implementación

