# 006 - [Composable] Utilidades de fecha y composable `useSchedule`

- **Prioridad:** 6
- **Estado:** Completado
- **Depende de:** 005, Feature 006 (contrato)
- **Fase:** Fase 3: Interfaz

## Objetivo

La UI dispone de utilidades de hora local del negocio y de un composable que encapsula la carga de sesiones, plantillas y bloqueos y las llamadas a las rutas de horarios.

## Contexto

`app/src/lib/datetime.ts` no existe hoy; el contrato prevé que la conversión a hora local viva allí (con `Intl`, zona `America/New_York`). Si la feature 006 ya la creó, ampliarla; si no, crear lo mínimo. `web/src/lib/schedule.ts` es la referencia (`weekStart`, `weekDays`, `classesForDay`, filtro por servicio), pero calcula con la zona del navegador y bloquea semanas pasadas; aquí la semana se calcula en la zona del negocio y se permiten semanas pasadas. `pb` está en `app/src/lib/pocketbase.ts`; las rutas propias se llaman con `pb.send`.

## Alcance

- `app/src/lib/datetime.ts`: `BUSINESS_TZ`, `localParts(iso)` → `{date, time, weekday}`, `formatTime(iso)` («7:30 PM»), `formatDayLabel(date)`, `localDateToUtcRange(date)` y `weekRangeUtc(weekStartDate)`, todo con `Intl.DateTimeFormat` y `timeZone`; sin `new Date().setHours` local.
- `app/src/lib/schedule-week.ts`: `weekStartFor(todayLocalDate, offset)` (domingo inicial; offset negativo permitido), `weekDays(start)`, `groupByDay(sessions)`, `filterSessions(sessions, {service, coach})` y `weekdayLabel(n)` (0 = Domingo); funciones puras con tipos `ClassSession`, `ClassTemplate`, `ScheduleBlock`.
- `app/src/composables/useSchedule.ts`: `loadWeek(offset)`, `loadTemplates()`, `loadBlocks()`, `generate({weeks})`, `cancelSession(id, reason)`, `moveSession(id, {startsAt, coach, reason})`, `assignCoach(templateId, coach, applyToFuture)`, `createSpecialSession(input)`, estado `loading`/`error` y errores del servidor por campo; carga con `expand: 'service,coach'` y filtro `starts_at >= :from && starts_at < :to` en UTC.
- Pruebas Vitest: `datetime.test.ts` (semana que cruza el cambio de horario de 2026-11-01: 7 días, lunes 19:30 locales en ambos lados; `localDateToUtcRange` del día del cambio dura 23 h en marzo y 25 h en noviembre), `schedule-week.test.ts` (offsets negativos, filtros, agrupación) y `useSchedule.test.ts` con `pb` simulado.
- Límites: sin componentes visuales.

## Criterios de aceptación

- [x] `weekStartFor` devuelve siempre domingo; con offset -1 devuelve la semana anterior.
- [x] La hora 7:30 PM se muestra igual antes y después del cambio de horario para una sesión del lunes.
- [x] `useSchedule` convierte errores 400 en `{campo: mensaje}`.
- [x] `bun run test`, `typecheck`, `lint` y `format:check` pasan.

## Referencias

- `features/009-horarios-y-clases/spec.md`, "Fase 3" → tarea 006.
- `web/src/lib/schedule.ts`.
- https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat

## Fuera de alcance

- Vistas y rutas del router (007, 008).

## Notas de implementación

Verificados 130 tests, comprobación de tipos, lint y formato. El cliente conserva el formato de hora existente y presenta AM/PM en las tarjetas. La semana usa límites UTC derivados de medianoche en Nueva York y acepta desplazamientos negativos.
