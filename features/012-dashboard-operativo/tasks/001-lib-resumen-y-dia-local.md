# 001 - [Lib] Resumen operativo y límites del día local

- **Prioridad:** 1
- **Estado:** Pendiente
- **Depende de:** Feature 011 (contrato), Feature 009 (contrato)
- **Fase:** Fase 1: Resumen operativo en la API

## Objetivo

Existe una librería pura y probada que calcula el día local de `America/New_York` en UTC y arma los conteos y alertas del dashboard.

## Contexto

goja no tiene `Intl` fiable. Verifica primero qué ofrece (`typeof Intl`, `toLocaleString` con `timeZone`) y qué helper de zona horaria dejó la feature 009 en `api/src/lib/` (léelo en disco; no se asume). Solo si ninguno basta se crea `api/src/lib/tz.ts` con las reglas de horario de verano de EE. UU. (segundo domingo de marzo a primer domingo de noviembre, a las 02:00 local). `bun test` lo habilita la feature 005; las libs compilan a CJS en `pb_hooks/lib/`.

## Alcance

- Documentar en las notas el resultado de la verificación de goja y la decisión (reutilizar el helper de 009, o crear `tz.ts`).
- Crear `api/src/lib/dashboard.ts` (puro):
  - `localDayBoundsUtc(now: Date, timeZone: string)` → `{ date: 'YYYY-MM-DD', startUtc, endUtc }` para el día local que contiene `now` (extremo final exclusivo).
  - `availabilityOf` se reutiliza de `booking-rules.ts` (011); no se duplica.
  - `summarizeSessions(sessions, bookings)` → sesiones con `booked`, `waitlisted`, `spots_left`, `availability`.
  - `buildAttention(sessions, bookings, now, days)` → alertas `no_coach` y `no_bookings` de sesiones `scheduled` futuras.
  - `buildCounts({ activeClients, todaySessions, todayBookings, attention })`.
- Pruebas `api/src/lib/dashboard.test.ts`: día normal; 23.30 h UTC (ya es el día siguiente en UTC pero no en local); medianoche local exacta; domingo de inicio de horario de verano (día de 23 h) y de fin (25 h); sesión a las 23:30 locales cae en su día; reservas por estado; alerta sin coach; alerta sin reservas contando solo `booked`; sesiones canceladas no alertan.

## Criterios de aceptación

- [ ] Para `now = 2026-11-22T03:30:00Z` el día local es `2026-11-21` con inicio `2026-11-21T05:00:00Z` (EST) o el que corresponda según el desfase vigente.
- [ ] En el día del cambio de horario el rango dura 23 o 25 horas.
- [ ] Las sesiones canceladas no cuentan en las alertas ni en las reservas del día.
- [ ] La lib no usa `Intl` en servidor ni importa PocketBase.
- [ ] `bun test` pasa y `bun run build:ts` genera `pb_hooks/lib/dashboard.js`.

## Referencias

- `features/012-dashboard-operativo/spec.md`, sección "Fase 1" → tarea 001.
- `api/src/lib/booking-rules.ts` (011) y helper de zona horaria de 009.
- https://www.nist.gov/pml/time-and-frequency-division/popular-links/daylight-saving-time

## Fuera de alcance

- Acceso a la base de datos y ruta HTTP (002).

## Notas de implementación

