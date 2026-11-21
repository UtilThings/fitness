# 002 - [Lib] Reglas de reserva, lista de espera y cancelación

- **Prioridad:** 2
- **Estado:** Pendiente
- **Depende de:** Feature 005 (contrato)
- **Fase:** Fase 1: Modelo y reglas puras

## Objetivo

Existe una librería pura, sin dependencias de PocketBase, que decide cupo, lista de espera, promoción, ventana de cancelación y disponibilidad, cubierta por pruebas exhaustivas.

## Contexto

Las libs viven en `api/src/lib/*.ts` y compilan a CJS en `api/pb_hooks/lib/`. Fechas en UTC (`Date` o ISO); no se usa `Intl`. La disponibilidad replica `web/src/lib/data.ts::availability` (`<=0` full, `<=2` almost, resto available). `bun test` lo habilita la feature 005.

## Alcance

- Crear `api/src/lib/booking-rules.ts` con tipos `BookingStatus`, `BookingLike` y las funciones:
  - `occupiedSeats(bookings)` (cuentan `booked`, `attended`, `no_show`), `spotsLeft(capacity, bookings)`, `availabilityOf(spotsLeft)`.
  - `canBook({ session, client, existing, now })`: sesión `scheduled` y futura, cliente no `inactive`, sin duplicado activo; devuelve `{ ok } | { ok: false, field, message }`.
  - `decideBookingStatus(capacity, bookings)` → `{ status: 'booked' } | { status: 'waitlisted', position }`.
  - `cancellationDeadline(startsAt, cancellationHours)` y `decideCancellation({ booking, startsAt, cancellationHours, now, override })` → `cancelled` | `late_cancelled` | error (sesión iniciada, estado no cancelable, excepción sin nota).
  - `shouldRestoreFreeClass(booking, nextStatus, clientBookings)`: `true` solo si la reserva tiene `free_class = true`, pasa a `cancelled` y el cliente no conserva otra reserva con `free_class = true` en `booked`, `attended`, `no_show` o `late_cancelled`; `false` para `late_cancelled`, `no_show` y `attended`.
  - `pickPromotion(bookings, capacity)` (primer `waitlisted` por posición con cupo libre) y `renumberWaitlist(bookings)`.
  - `canMarkAttendance({ startsAt, now, override })` y `nextAttendanceStatus`.
  - `classifyTransition(old, next)` con los eventos `booking.*` del spec.
- Pruebas `api/src/lib/booking-rules.test.ts` (`bun test`) exhaustivas: cupo 0, justo lleno, uno libre, sobrecupo defensivo; espera con una y varias posiciones, renumeración tras promoción intermedia; promoción sin cupo libre (no promueve); ventana en el límite exacto (`now == deadline` → a tiempo), 1 s después (tardía), 12 h y 24 h; cancelación de `waitlisted` nunca tardía; excepción con y sin nota; sesión ya iniciada; cada celda de `classifyTransition`; disponibilidad en 0, 1, 2, 3.

## Criterios de aceptación

- [ ] Una cancelación exactamente en el límite de la ventana es a tiempo y un segundo después es tardía.
- [ ] Con 6 de 6 cupos, `decideBookingStatus` devuelve `waitlisted` con la posición siguiente; al liberar un cupo `pickPromotion` devuelve la reserva en posición 1.
- [ ] `shouldRestoreFreeClass` devuelve `true` al cancelar a tiempo una reserva `free_class` y `false` para `late_cancelled`, `no_show`, `attended` o si hay otra reserva `free_class` vigente.
- [ ] `availabilityOf(0|1|2|3)` devuelve `full|almost|almost|available`.
- [ ] La lib no importa nada de PocketBase ni usa `Intl`.
- [ ] `bun test` pasa y `bun run build:ts` genera `pb_hooks/lib/booking-rules.js`.

## Referencias

- `features/011-reservas-y-asistencia/spec.md`, secciones "Máquina de estados" y "Fase 1" → tarea 002.
- `web/src/lib/data.ts` (`availability`).
- https://bun.sh/docs/cli/test

## Fuera de alcance

- Acceso a la base de datos, hooks y rutas (003-005).

## Notas de implementación

