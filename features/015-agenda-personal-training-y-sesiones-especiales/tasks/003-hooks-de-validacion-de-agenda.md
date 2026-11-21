# 003 - [Hook] Validación de disponibilidad y sesiones privadas/especiales

- **Prioridad:** 3
- **Estado:** Pendiente
- **Depende de:** 001, 002
- **Fase:** Fase 3: Servidor

## Objetivo

El servidor rechaza tramos de disponibilidad inválidos y sesiones `private`/`special` que choquen o incumplan las reglas, sin importar desde dónde se creen.

## Contexto

`class_sessions` puede crearse desde el calendario de 009 con reglas de colección; estos hooks añaden las reglas de negocio de 015. Cada callback de goja debe hacer `require(`${__hooks}/lib/scheduling`)`. Las sesiones `regular` no se tocan. Auditoría con `audit-config.ts` (005).

## Alcance

- Crear `api/src/hooks/scheduling.ts`:
  - `onRecordCreateRequest`/`onRecordUpdateRequest("coach_availability")`: `validateAvailabilitySlots` contra los tramos existentes del coach; el coach debe estar activo y tener rol `coach` u `owner`.
  - `onRecordCreateRequest`/`onRecordUpdateRequest("class_sessions")` con `kind = private`: servicio `personal`, coach obligatorio, capacidad 1-2, disponibilidad y choques (`findCoachConflicts` incluye sesiones de cualquier `kind` y `schedule_blocks`); con `kind = special`: título obligatorio, choques si hay coach.
  - Errores con `BadRequestError` y el `code` correspondiente, con la sesión en conflicto en el detalle.
  - Impedir reducir `capacity` por debajo de las reservas `booked`.
- Registrar `coach_availability` en `api/src/lib/audit-config.ts`.
- Casos en `scripts/verify-api.sh` (choque, fuera de disponibilidad, especial sin título, edición válida).

## Criterios de aceptación

- [ ] Un tramo solapado del mismo coach/día devuelve `400`.
- [ ] Crear una `private` fuera de disponibilidad o con choque devuelve `400` con el código esperado; las `regular` siguen funcionando como antes.
- [ ] Una `special` sin título devuelve `400`.
- [ ] Editar una sesión no choca consigo misma.
- [ ] Los cambios de disponibilidad quedan en `audit_logs`.
- [ ] `bun run build:ts` y `scripts/verify-api.sh` pasan.

## Referencias

- `features/015-agenda-personal-training-y-sesiones-especiales/spec.md`, "Fase 3" → tarea 003.
- https://pocketbase.io/docs/js-event-hooks/

## Fuera de alcance

- Creación de reservas y ruta transaccional (004).

## Notas de implementación

<!-- Vacío al crear la tarea. -->
