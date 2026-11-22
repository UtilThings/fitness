# 004 - [Hook] Validaciones, bloqueos por feriado y auditoría

- **Prioridad:** 4
- **Estado:** Completado
- **Depende de:** 001, 003, Feature 005 (contrato)
- **Fase:** Fase 2: Lógica pura y reglas de servidor

## Objetivo

El servidor valida plantillas, sesiones y bloqueos, cancela automáticamente las sesiones de un bloqueo y genera las sesiones de una plantilla nueva, dejando todo auditado.

## Contexto

Los hooks viven en `api/src/hooks/*.ts` (compilan a `api/pb_hooks/*.pb.js`) y cada callback hace `require(`${__hooks}/lib/<x>`)` (goja no comparte scope). Existen por contrato `audit_logs` y el helper de auditoría (005) y el registro en `api/src/lib/audit-config.ts`. Las reglas de transición y la conversión local↔UTC están en la tarea 003. El evento de cancelación es la transición `scheduled → cancelled` de `class_sessions`; este hook no escribe en `bookings` ni notifica.

## Alcance

- Crear `api/src/hooks/schedule.ts`:
  - Plantillas: servicio activo, `coach` activo y con rol distinto de `reception`, `capacity ≥ 1`; rechazar borrado si hay sesiones (mensaje «desactívala en su lugar»). Tras crear o activar (`active` pasa a `true`), generar sus sesiones de la ventana con `generateSessions`.
  - Sesiones: validar transiciones (`canTransition`), exigir `cancel_reason` al pasar a `cancelled`, limpiar el motivo al reabrir (solo owner), impedir cambiar `template`, `service` y `starts_at` de sesiones `completed`.
  - Bloqueos: `date_to ≥ date_from`; `onRecordAfterCreateSuccess` y `onRecordAfterUpdateSuccess` cancelan las sesiones `scheduled` entre `blockRangeUtc(block)` con `cancel_reason = "Bloqueo: <título>"`, una a una (para que cada transición dispare el evento) y registran un resumen de auditoría con el número de sesiones.
- Modificar `api/src/lib/audit-config.ts` para registrar `class_templates`, `class_sessions` y `schedule_blocks`.
- Pruebas: lógica ya cubierta en la tarea 003; añadir casos si aparece lógica nueva (p. ej. selección de sesiones afectadas por un bloqueo). Integración real en la tarea 009.
- Límites: sin rutas (005); sin lógica de reservas.

## Criterios de aceptación

- [x] Crear una plantilla activa crea sus sesiones en la ventana; activar una inactiva también; crearla inactiva no genera nada.
- [x] Cancelar sin `cancel_reason` por la API de colecciones devuelve 400; con motivo, se guarda.
- [x] Un `reception` no puede reabrir una sesión cancelada; un owner sí y el motivo se limpia.
- [x] Crear un bloqueo de un día cancela las sesiones `scheduled` de ese día local (verificado en un día con cambio de horario y en uno normal) y no toca `completed` ni ya `cancelled`.
- [x] `date_to` anterior a `date_from` devuelve 400.
- [x] Borrar una plantilla con sesiones devuelve 400; sin sesiones, borra y audita.
- [x] `bun test` y `bun run build:ts` pasan.

## Referencias

- `features/009-horarios-y-clases/spec.md`, "Contrato HTTP → Evento de cancelación" y "Flujos Críticos" 3 y 5.
- `api/pb_hooks/users.pb.js` (patrón de hook).
- https://pocketbase.io/docs/js-event-hooks/
- https://pocketbase.io/docs/js-records/

## Fuera de alcance

- Rutas y cron (005); cancelación de reservas (feature 011); notificaciones (feature 018).

## Notas de implementación

Verificado con PocketBase temporal. La creación y activación generan cuatro sesiones por plantilla, y el seed deja la generación al cron o a la ruta. Los bloqueos se guardan con sus cancelaciones en una transacción y los eventos por sesión se emiten tras el commit. Se probaron los límites en un día normal y el día del cambio de hora, reapertura por rol, motivos, borrado y auditoría.
