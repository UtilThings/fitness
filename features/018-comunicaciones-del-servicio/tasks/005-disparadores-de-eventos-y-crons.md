# 005 - [Hook] Disparadores de eventos y crons de avisos

- **Prioridad:** 5
- **Estado:** Completado
- **Depende de:** 003, 004, Feature 009 (contrato), Feature 011 (contrato), Feature 013 (contrato), Feature 014 (contrato)
- **Fase:** Fase 3: Hooks

## Objetivo

Los seis mensajes operativos se envían automáticamente: confirmación de reserva, promoción desde lista de espera, aviso de cancelación o cambio de clase, recordatorio, aviso de cobro y aviso de renovación.

## Contexto

`bookings` (011) cambia de estado por reglas propias (cupo, promoción automática de la lista de espera) y `class_sessions` (009) se cancela por el admin o por bloqueos de agenda, con cancelación en cascada de reservas. Esta feature no modifica esos hooks: se engancha tras éxito (`onRecordAfterCreateSuccess` / `onRecordAfterUpdateSuccess`), comparando `e.record` con `e.record.original()`, y ejecuta el envío sin propagar errores. Los crons usan `message-policy` (003) y `sendServiceMessage` (004).

## Alcance

- En `api/src/hooks/messages.ts` (o `messages-triggers.ts` si crece): `bookings` creada en `booked` → `booking_confirmed`; transición `waitlisted → booked` → `waitlist_promoted`; `class_sessions` con `status → cancelled` → `class_cancelled` (motivo en `cancel_reason`) y cambio de `starts_at` o `coach` en sesión `scheduled` → `class_cancelled` en variante «cambio» usando las mismas variables (la plantilla indica la nueva fecha); destinatarios: reservas `booked` y `waitlisted`.
- Crons (`cronAdd`): `class_reminders` (cada 15 min; ventana `MESSAGES_REMINDER_HOURS`, 24 por defecto), `payment_due_notices` y `renewal_notices` (cada hora; solo actúan dentro de `isSendHour`), todos con `dedupeKey` para ser idempotentes.
- Variables de entorno leídas con `$os.getenv`: `MESSAGES_REMINDER_HOURS`, `MESSAGES_DUE_DAYS_BEFORE` (3), `MESSAGES_RENEWAL_DAYS_BEFORE` (5), `STUDIO_NAME`, `STUDIO_PHONE`; con valores por defecto y validación (entero positivo).
- Los envíos masivos de una cancelación se hacen uno a uno con registro individual y sin abortar si uno falla.
- Documentar en el encabezado del archivo que el origen de la cancelación es el estado de `class_sessions` (no una llamada directa), de modo que 009/011 no necesitan conocer esta feature.

## Criterios de aceptación

- [x] Crear una reserva `booked` produce un mensaje `booking_confirmed`; una reserva `waitlisted` no.
- [x] La promoción automática `waitlisted → booked` produce `waitlist_promoted` y no una segunda confirmación.
- [x] Cancelar una sesión con 4 reservas `booked` y 1 `waitlisted` genera 5 mensajes, un registro por destinatario, y no repite al guardar de nuevo la sesión cancelada.
- [x] El cron de recordatorios envía exactamente un recordatorio por reserva `booked` dentro de la ventana, aunque corra varias veces.
- [x] Los crons de cobro y renovación solo envían a las 09:00 locales y una vez por vencimiento/periodo.
- [x] Un fallo del correo no revierte ni bloquea la reserva ni la cancelación.
- [x] `bun run build:ts`, `bun test` y `scripts/verify-api.sh` pasan en verde.

## Referencias

- `features/018-comunicaciones-del-servicio/spec.md`, sección "Fase 3" → tarea 005.
- https://pocketbase.io/docs/js-event-hooks/
- https://pocketbase.io/docs/js-jobs-scheduling/

## Fuera de alcance

- Rutas HTTP de vista previa, mensaje manual y prueba (006).
- Cambios en los hooks de 009 y 011.
- Cobros automáticos o pasarela de pagos.

## Notas de implementación

- La cancelación parte de `class_sessions` y usa los eventos confirmados de la cascada de reservas para conservar los destinatarios exactos.
- `scripts/verify-api.sh` valida confirmaciones, promoción, cambios, cancelación de los cinco inscritos y deduplicación del cron de recordatorios. Se verificaron cobro y renovación a las 09:00 locales con un reloj controlado, incluido el cambio de horario.
