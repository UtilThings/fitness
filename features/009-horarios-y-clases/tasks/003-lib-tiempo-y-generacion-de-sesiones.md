# 003 - [Lib] Tiempo `America/New_York` y generación de sesiones

- **Prioridad:** 3
- **Estado:** Pendiente
- **Depende de:** Feature 005 (contrato)
- **Fase:** Fase 2: Lógica pura y reglas de servidor

## Objetivo

Existe una librería pura y probada que convierte hora local de Miramar a UTC (incluido el cambio de horario), genera las sesiones de una ventana, respeta bloqueos y define las reglas de estado de una sesión.

## Contexto

`api/src/lib/*.ts` compila a CJS en `api/pb_hooks/lib/` y se carga con `require(`${__hooks}/lib/<x>`)` desde cada callback; `bun test` (script de la feature 005) ejecuta las pruebas. goja no ofrece `Intl` fiable: comprobar primero qué hay disponible (`typeof Intl`, `new Date().toLocaleString('en-US', {timeZone: 'America/New_York'})`) en el PocketBase fijado y documentarlo en las notas; el diseño no depende de ello. Reglas DST de EE. UU. desde 2007: empieza el segundo domingo de marzo a las 2:00 locales (UTC-5 → UTC-4) y termina el primer domingo de noviembre a las 2:00 locales (UTC-4 → UTC-5). Referencia de comportamiento de semana: `web/src/lib/schedule.ts` (domingo inicial).

## Alcance

- Extender `api/src/lib/tz.ts` (creado en la feature 005, tarea 006; no duplicar el helper, añadir solo lo que falte, p. ej. `addDays`, `weekdayOf`, `localDateToUtcRange`, y reutilizar `nyOffsetMinutes`, `localToUtc`, `utcToLocal` ya existentes; adaptar la firma si 005 usa ISO en lugar de milisegundos): `nyOffsetMinutes(utcMs)`, `localToUtc(date: 'YYYY-MM-DD', time: 'HH:mm'): number` (hora inexistente se adelanta una hora; hora ambigua usa la primera ocurrencia, EDT), `utcToLocal(utcMs)` → `{date, time, weekday}`, `addDays(date, n)`, `weekdayOf(date)` (0 = domingo) y `localDateToUtcRange(date)`; sin `Date` locales ni `Intl` (solo `Date.UTC`).
- Crear `api/src/lib/schedule-gen.ts`: `SESSION_WINDOW_WEEKS = 4`, `generateSessions({templates, services, blocks, from, weeks, existingKeys})` → `{toCreate, skippedExisting, skippedBlocked}`; cada sesión hereda `service`, `duration_min`, `capacity`, `coach` (plantilla → `service.default_coach` → vacío), `kind: 'regular'`, `status: 'scheduled'`; ignora plantillas inactivas y servicios inactivos; `existingKeys` es un `Set` de `template|starts_at ISO`; `isBlocked(date, blocks)` con rango inclusivo; `blockRangeUtc(block)`.
- Crear `api/src/lib/session-rules.ts`: `canTransition(from, to, role)`, `isCancellationTransition(prev, next)`, `validateCancelReason(text)`, `validateMove({startsAt, now, blocked, conflict})`.
- Pruebas `tz.test.ts`, `schedule-gen.test.ts`, `session-rules.test.ts`:
  - DST primavera (domingo 2026-03-08) y otoño (domingo 2026-11-01): 19:30 local → `23:30Z` en verano y `00:30Z` (día siguiente) en invierno; 09:00 local → `13:00Z` / `14:00Z`; offsets en 2026-03-07 vs 2026-03-09 y 2026-10-31 vs 2026-11-02.
  - Semana del cambio sin saltos ni duplicados; hora inexistente `02:30` del 2026-03-08 y ambigua `01:30` del 2026-11-01.
  - `utcToLocal` es inversa de `localToUtc` (ida y vuelta en todo el año 2026).
  - Generación de las 9 plantillas reales en 4 semanas = 36 sesiones; segunda ejecución con `existingKeys` = 0; bloqueo de un día y de un rango; plantilla/servicio inactivo; coach de respaldo.
  - Transiciones válidas e inválidas; reabrir solo owner.
- Límites: sin acceso a PocketBase ni a entorno.

## Criterios de aceptación

- [ ] `bun test` en `api/` pasa con los casos DST de marzo y noviembre.
- [ ] Generar dos veces con las claves resultantes crea 0 sesiones la segunda vez.
- [ ] Ninguna sesión generada cae en una fecha local bloqueada (incluidos los extremos del rango).
- [ ] `bun run build:ts` genera `schedule-gen.js` y `session-rules.js` sin errores.
- [ ] Las notas registran qué ofrece goja (`Intl`) y por qué se usa el helper.

## Referencias

- `features/009-horarios-y-clases/spec.md`, "Fase 2" → tarea 003 y "Flujos Críticos" 1-2.
- `web/src/lib/schedule.ts` (semana y filtro, referencia de comportamiento).
- https://www.nist.gov/pml/time-and-frequency-division/popular-links/daylight-saving-time
- https://bun.sh/docs/cli/test

## Fuera de alcance

- Persistencia y hooks (004, 005); conversión de la UI (006).

## Notas de implementación

<!-- Vacío al crear la tarea. -->
