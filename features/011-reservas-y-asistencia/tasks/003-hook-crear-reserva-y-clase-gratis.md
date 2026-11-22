# 003 - [Hook] Crear reserva (booked o waitlisted) y consumo de clase gratis

- **Prioridad:** 3
- **Estado:** Completado
- **Depende de:** 001, 002
- **Fase:** Fase 2: Hooks y endpoints

## Objetivo

Crear una reserva por API asigna `booked` o `waitlisted` de forma transaccional, sin sobreventa, y consume la clase gratis cuando corresponde.

## Contexto

Los hooks viven en `api/src/hooks/bookings.ts` y compilan a `api/pb_hooks/bookings.pb.js`; en goja cada callback hace `require(`${__hooks}/lib/booking-rules`)`. La verificación de la tarea 001 fija el uso de `$app.runInTransaction`. `clients.free_class_used` solo lo cambia un owner por API (010); el sistema lo marca con un guardado interno, que no pasa por los hooks `*Request`.

## Alcance

- `onRecordCreateRequest("bookings")` dentro de `$app.runInTransaction`:
  - Cargar sesión (con `service`), cliente y reservas de la sesión; validar con `canBook`; si ya existe una reserva `cancelled`/`late_cancelled` de ese cliente en la sesión, reactivarla en lugar de insertar.
  - Fijar `status` y `waitlist_position` con `decideBookingStatus`; forzar `source = admin`, vaciar `cancelled_at`, `marked_by` y cualquier valor enviado por el cliente en `status`/`waitlist_position`.
  - Si `requestInfo().body.use_free_class` es verdadero: exigir `free_class_used = false` y un plan `is_first_class` activo en `session.service`; guardar `bookings.free_class = true` (también al reactivar una reserva cancelada) y marcar `clients.free_class_used = true` con guardado interno en la misma transacción; ignorar cualquier `free_class` enviado directamente en el cuerpo. Si no es elegible, `400` en `data.use_free_class`.
- Auditoría con el helper de 005.
- Casos de prueba manual (o `tests` de PocketBase si la 005 los habilitó) para los criterios; la lógica ya se prueba en 002.

## Criterios de aceptación

- [x] Con capacidad 2: dos reservas quedan `booked`; la tercera `waitlisted` con `waitlist_position = 1`.
- [x] Dos peticiones simultáneas sobre el último cupo no dan dos `booked`.
- [x] Reservar una sesión cancelada, pasada o a un cliente `inactive` devuelve `400`.
- [x] Reservar de nuevo tras cancelar reactiva el registro existente sin romper el índice único.
- [x] `use_free_class` marca `free_class_used = true` una sola vez; el segundo intento devuelve `400`.
- [x] La reserva queda con `free_class = true` y un `free_class` enviado en el cuerpo sin `use_free_class` se ignora.
- [x] Un `status` o `source` enviado en el cuerpo se ignora.
- [x] `bun run build:ts` genera el hook y `bun test` pasa.

## Referencias

- `features/011-reservas-y-asistencia/spec.md`, sección "Fase 2" → tarea 003.
- `api/src/lib/booking-rules.ts` (tarea 002); `features/010-clientes/spec.md` (regla de `free_class_used`).
- https://pocketbase.io/docs/js-event-hooks/

## Fuera de alcance

- Cancelación, promoción y asistencia (004); créditos (013).

## Notas de implementación


Prueba HTTP con PocketBase 0.40.5 y base temporal: dos solicitudes concurrentes para el último cupo dieron una reserva y una entrada en espera. Se verificaron los errores por campo, la reactivación con el mismo ID, la elegibilidad, los campos administrados por el servidor y el registro de auditoría.
