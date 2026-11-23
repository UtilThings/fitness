# 003 - [Hook] Validación de coaching y sincronización con la membresía

- **Prioridad:** 3
- **Estado:** Completado
- **Depende de:** 001, 002
- **Fase:** Fase 3: Servidor

## Objetivo

El servidor valida programas y check-ins, y mantiene la renovación y el estado del programa alineados con su membresía.

## Contexto

Las reglas de colección (001) permiten escribir a ciertos roles; los hooks aplican reglas de negocio. 013 modifica `memberships` con rutas transaccionales (`current_period_end`, `status`). Cada callback de goja debe hacer `require(`${__hooks}/lib/coaching`)`. Auditoría vía `audit-config.ts` (005).

## Alcance

- Crear `api/src/hooks/coaching.ts`:
  - `onRecordCreateRequest`/`onRecordUpdateRequest("coaching_programs")`: `validateProgramInput`; el cliente debe tener la membresía `active` indicada y su plan debe pertenecer a un servicio `kind = online`; coach activo con rol `coach` u `owner`; fija `renews_on = current_period_end + 1` al crear; impide reabrir un programa `ended`.
  - `onRecordCreateRequest("coaching_checkins")`: `validateCheckin` (adherencia entera 1-5, fecha no futura, programa no `ended`); rellena `created_by`.
  - `onRecordAfterUpdateSuccess("memberships")`: para programas vinculados, actualizar `renews_on` si cambió `current_period_end`; `paused` → programa `paused`, `active` → `active`, `cancelled` → `ended`; `expired` no cambia el programa.
- Registrar `coaching_programs` y `coaching_checkins` en `api/src/lib/audit-config.ts`.
- Casos en `scripts/verify-api.sh`: alta válida, alta sin membresía online, check-in inválido, sincronización al renovar y al cancelar.

## Criterios de aceptación

- [x] Crear un programa sin membresía online activa devuelve `400`.
- [x] Un check-in con adherencia 6, fecha futura o sobre programa `ended` devuelve `400`.
- [x] Renovar la membresía mueve `renews_on`; cancelarla deja el programa `ended`; pausarla lo pausa.
- [x] Los cambios quedan en `audit_logs`.
- [x] `bun run build:ts` y `scripts/verify-api.sh` pasan.

## Referencias

- `features/016-online-coaching/spec.md`, "Reglas de dominio" y "Fase 3" → tarea 003.
- https://pocketbase.io/docs/js-event-hooks/

## Fuera de alcance

- UI (004-006); avisos al cliente (018).

## Notas de implementación

La renovación se deriva en el servidor. Las ediciones conservan la membresía enlazada cuando está pausada o vencida; una nueva vinculación o reactivación requiere una membresía activa. Se verificaron los cambios de estado, incluida la expiración, y los valores anterior y nuevo de la renovación en auditoría.
