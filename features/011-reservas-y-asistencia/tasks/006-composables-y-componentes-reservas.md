# 006 - [Componente] Composables y componentes de reservas

- **Prioridad:** 6
- **Estado:** Completado
- **Depende de:** 003, 004, 005, Feature 010 (contrato)
- **Fase:** Fase 3: Interfaz

## Objetivo

La app dispone de los composables y componentes reutilizables para reservar, cancelar con aviso, ver inscritos y marcar asistencia.

## Contexto

`app/` usa PrimeVue 5 y el SDK de PocketBase (`pb`). 010 aporta `ClientPicker` y `useClients`; 009 aporta la vista y el calendario de sesiones. Los textos van en español y las horas se muestran con `app/src/lib/datetime.ts` (zona `America/New_York`).

## Alcance

- `app/src/lib/bookings.ts`: etiquetas y severidad por estado, `formatDeadline`, tipo `Availability`.
- `app/src/composables/useBookings.ts`: `listBySession`, `listByClient`, `create({ session, client, useFreeClass })`, `cancel(id, { overrideNote })`, `markAttendance(id, status, overrideNote)`; errores del servidor mapeados a campos.
- `app/src/composables/useSessionAvailability.ts`: disponibilidad de una sesión y de un rango contra el endpoint de 005.
- Componentes en `app/src/components/bookings/`:
  - `AvailabilityTag.vue` («Disponible», «Casi llena», «Llena» y cupos restantes).
  - `BookingDialog.vue`: elegir cliente (`ClientPicker`) o recibirlo por prop, mostrar cupos o aviso «Se añadirá a la lista de espera», casilla «Primera clase gratis» solo si el cliente es elegible.
  - `CancelBookingDialog.vue`: muestra el límite de cancelación; si ya pasó, avisa de la penalización y permite «Cancelar con excepción» con nota obligatoria.
  - `SessionRoster.vue`: tablas de inscritos y lista de espera, acciones cancelar y marcar asistió/no se presentó (habilitadas desde la hora de inicio).
- Pruebas Vitest de `lib/bookings.ts` y de los composables con `pb` simulado.

## Criterios de aceptación

- [x] `BookingDialog` avisa de la lista de espera cuando `spots_left = 0`.
- [x] `CancelBookingDialog` exige nota solo cuando la excepción aplica y muestra el límite en hora local.
- [x] `SessionRoster` deshabilita la asistencia antes del inicio de la sesión.
- [x] `typecheck`, `lint`, `format:check` y `test` pasan.

## Referencias

- `features/011-reservas-y-asistencia/spec.md`, sección "Fase 3" → tarea 006.
- https://primevue.org/dialog/

## Fuera de alcance

- Montaje en las vistas de 009 y 010 (007).

## Notas de implementación


Typecheck, lint, formato y 166 pruebas de la app en verde. Se comprobó en pruebas de montaje el aviso de espera, la hora local y la nota de excepción, y el paso de asistencia deshabilitada a habilitada al inicio de la clase.
