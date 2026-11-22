# 004 - [Hook] Cancelación, promoción, asistencia y sesión cancelada

- **Prioridad:** 4
- **Estado:** Completado
- **Depende de:** 001, 002, 003
- **Fase:** Fase 2: Hooks y endpoints

## Objetivo

Cancelar o marcar asistencia respeta la ventana de cancelación, libera cupo y promueve a la lista de espera; cancelar una sesión cancela sus reservas sin penalizar.

## Contexto

`bookings.ts` ya trae el hook de creación (003). La ventana sale de `services.cancellation_hours` (12/24) y la hora de `class_sessions.starts_at` (UTC). 009 cancela sesiones por actualización de `class_sessions.status` (manual o por `schedule_blocks`, posiblemente con guardados internos). 013 observará estas transiciones sin que esta tarea la implemente.

## Alcance

- `onRecordUpdateRequest("bookings")` en transacción:
  - Aceptar solo `status` (`cancelled`, `attended`, `no_show`) y `override_note`; ignorar el resto de campos.
  - Cancelar: `decideCancellation` → `cancelled` o `late_cancelled`; la excepción exige `override_note`; registrar `cancelled_at` y `marked_by` (`e.auth.id`).
  - Si se libera cupo (de `booked`), promover con `pickPromotion`, poner `waitlist_position = 0` y renumerar la espera; si se cancela una `waitlisted`, solo renumerar.
  - Asistencia: `canMarkAttendance` (antes de la hora requiere `override_note`); permitir corregir `attended` ⇄ `no_show` con nota.
  - Restitución de la clase gratis: dentro de la misma transacción, si `shouldRestoreFreeClass` es verdadero, poner `clients.free_class_used = false` con guardado interno (cancelación a tiempo, con excepción del admin o desde la lista de espera); no restituir en `late_cancelled`, `no_show` ni `attended`.
- `onRecordAfterUpdateSuccess("class_sessions")` (módulo `api/src/hooks/bookings-sessions.ts` o el mismo archivo): si `status` pasa a `cancelled`, cancelar las reservas `booked`/`waitlisted` como `cancelled` con `override_note = "session_cancelled"` y `waitlist_position = 0`, sin penalización y sin promover; restituir `clients.free_class_used = false` en las reservas con `free_class = true` (misma regla `shouldRestoreFreeClass`).
- Auditoría con el helper de 005 (acción `update`, resumen con el evento de `classifyTransition`).
- Documentar en comentarios de cabecera de la lib el contrato de eventos para 013.

## Criterios de aceptación

- [x] Cancelar a tiempo una reserva `booked` con espera promueve al primero y renumera.
- [x] Cancelar dentro de la ventana sin nota da `late_cancelled` y también libera el cupo y promueve.
- [x] Con `override_note` fuera de ventana el estado es `cancelled`; sin nota en excepción devuelve `400`.
- [x] Cancelar una `waitlisted` nunca da `late_cancelled`.
- [x] Marcar `attended` antes del inicio sin nota devuelve `400`; después del inicio funciona.
- [x] Cancelar una sesión (también por `schedule_blocks`) deja todas sus reservas en `cancelled` y no promueve a nadie.
- [x] Cancelar a tiempo (o desde la espera) una reserva `free_class` deja `clients.free_class_used = false`; `late_cancelled` o `no_show` lo dejan en `true`.
- [x] Cancelar la sesión restituye la clase gratis de sus reservas `free_class`.
- [x] Una transición inválida (p. ej. `cancelled` → `attended`) devuelve `400`.

## Referencias

- `features/011-reservas-y-asistencia/spec.md`, secciones "Máquina de estados" y "Fase 2" → tarea 004.
- `api/src/lib/booking-rules.ts` (tarea 002), `api/src/hooks/bookings.ts` (tarea 003).
- https://pocketbase.io/docs/js-event-hooks/

## Fuera de alcance

- Descuento de créditos y renovaciones (013); avisos al cliente (018).

## Notas de implementación


Se verificaron por HTTP la promoción y renumeración, la excepción con nota, la asistencia y su corrección, la restitución de clase gratis y los ocho eventos en audit_logs. La cascada se ejecuta en el hook de actualización del modelo, antes del commit, para que una sesión y sus reservas se cancelen juntas también cuando el origen sea un bloqueo. Los hooks de éxito observan la transacción completa. El PATCH admite override: true para pedir una excepción explícita y exigir su nota. También se rechaza una reducción de capacidad por debajo de los cupos ocupados.
