# 005 - [Hook] Consumo de créditos y validación de reservas sin créditos

- **Prioridad:** 5
- **Estado:** Pendiente
- **Depende de:** 003, 004
- **Fase:** Fase 3: Servidor

## Objetivo

Los créditos se descuentan automáticamente cuando 011 marca asistencia o cancelación tardía, y reservar sin créditos se bloquea salvo override del admin.

## Contexto

`bookings` (011) tiene `status`, `override_note` y relación a `class_sessions`; `credit_movements.booking` enlaza el movimiento. Para no depender de `e.record.original()` tras guardar, la reconciliación calcula lo que corresponde cobrar según el estado actual y lo compara con la suma de movimientos ya enlazados a la reserva (idempotente). Verificar antes qué dispara `onRecordAfterUpdateSuccess` (también con `app.save` desde rutas) y si `original()` está disponible en los hooks de petición.

## Alcance

- Crear `api/src/hooks/membership-bookings.ts`:
  - `onRecordAfterCreateSuccess`/`onRecordAfterUpdateSuccess("bookings")`: localizar la membresía aplicable (activa, plan del mismo servicio, menor `current_period_end`; para `per_4_weeks` ilimitado no hay movimiento), llamar `creditsToApply` y `recordMovement` (004). Al pasar a `attended` con `first_visit`, marcar `clients.free_class_used = true`.
  - `onRecordCreateRequest`/`onRecordUpdateRequest("bookings")` cuando el nuevo estado sea `booked` o `waitlisted`: si `requiresCredit`, ejecutar `checkBookingEligibility`; rechazar con `BadRequestError` y `code: no_credits | weekly_limit | no_membership` salvo `override_note` no vacía.
  - Ruta `GET /api/admin/memberships/eligibility?client=&session=` para precomprobar en la UI.
- Exportar `checkEligibility(app, clientId, session)` desde `memberships-service.ts` (reutilizada por la feature 015).
- Añadir al script de verificación: reservar sin créditos (rechazo), con override (permitido), marcar asistida (`attend -1`), pasar a `cancelled` (`adjust +1`).

## Criterios de aceptación

- [ ] `attended` y `late_cancelled` crean un único movimiento enlazado a la reserva; repetir el guardado no duplica.
- [ ] `no_show` registra `late_cancel` con nota "No-show".
- [ ] Reserva con saldo 0 sin `override_note` → `400 no_credits`; con nota → creada y saldo negativo tras asistir.
- [ ] Sesiones `special` y servicios `online` no se validan ni consumen.
- [ ] `GET /eligibility` devuelve `allowed`, `code` y `available`.
- [ ] `bun run build:ts` y `scripts/verify-api.sh` pasan.

## Referencias

- `features/013-membresias-y-creditos/spec.md`, "Validación de reserva sin créditos" y "Fase 3" → tarea 005.
- `api/src/lib/credits.ts` (003), `api/src/lib/memberships-service.ts` (004).
- https://pocketbase.io/docs/js-event-hooks/

## Fuera de alcance

- UI del diálogo de excepción (007/008); promoción de lista de espera (011).

## Notas de implementación

<!-- Vacío al crear la tarea. -->
