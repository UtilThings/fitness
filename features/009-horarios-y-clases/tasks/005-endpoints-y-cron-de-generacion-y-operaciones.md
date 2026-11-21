# 005 - [Endpoint] Generación (ruta y cron), cancelar, mover y asignar coach

- **Prioridad:** 5
- **Estado:** Pendiente
- **Depende de:** 002, 003, 004
- **Fase:** Fase 2: Lógica pura y reglas de servidor

## Objetivo

Las plantillas se materializan en sesiones de forma idempotente (a demanda y cada día) y el personal puede cancelar, mover y reasignar coach de sesiones puntuales con motivo y auditoría.

## Contexto

Las rutas propias usan `routerAdd` con `apis.requireAuth("admins")`; los roles son `owner`, `coach`, `reception` (contrato). La lógica pura está en `tz`, `schedule-gen` y `session-rules` (tarea 003) y los hooks de validación en la tarea 004. Contrato HTTP completo en el spec (prefijo `/api/admin/`; si la feature 005 definió otro, ajustar y anotarlo). Comprobar en la versión fijada la API `cronAdd` de PocketBase JS y que las rutas no colisionan con las colecciones.

## Alcance

- Crear `api/src/hooks/schedule-routes.ts` con:
  - `POST /api/admin/sessions/generate` (owner): lee plantillas, servicios, bloqueos y claves existentes de la ventana, usa `generateSessions` y guarda en lote capturando conflictos del índice único como `skipped_existing`; responde `{created, skipped_existing, skipped_blocked, window}`; valida `weeks` 1-12.
  - `cronAdd("jq_generate_sessions", "0 7 * * *", ...)` con la misma función y 4 semanas.
  - `POST /api/admin/sessions/{id}/cancel` (owner, reception): valida motivo y estado; guarda `status = cancelled` y `cancel_reason`.
  - `POST /api/admin/sessions/{id}/move` (owner, reception): valida con `validateMove` (futuro, fuera de bloqueos, sin choque con otra sesión `scheduled` del mismo coach), en una sola transacción cancela la original (motivo «Movida: <reason>») y crea una sesión `kind = special`, sin plantilla, con servicio, duración, cupo y coach (o el indicado) de la original y `notes` con la referencia; responde `{cancelled, created}`.
  - `POST /api/admin/class-templates/{id}/assign-coach` (owner): valida coach activo no `reception` (o `""`); actualiza la plantilla y, si `apply_to_future`, las sesiones futuras `scheduled` de esa plantilla.
- Auditoría de cada operación con el helper de la feature 005 (acción `custom`, resumen con conteos).
- Pruebas: reglas ya cubiertas en la tarea 003; la verificación HTTP real queda en la tarea 009. Documentar en el código el contrato de errores del spec.
- Límites: sin UI; no escribe en `bookings`.

## Criterios de aceptación

- [ ] `generate` la primera vez crea 36 sesiones (9 plantillas × 4 semanas) y la segunda `created: 0`.
- [ ] El cron queda registrado (visible en `/_/` → Ajustes → Crons) y ejecutarlo equivale a la ruta.
- [ ] `cancel` sin motivo → 400; en sesión ya cancelada → 400; con rol `coach` → 403; correcto → sesión `cancelled` y la transición dispara el evento (comprobable con un hook de prueba).
- [ ] `move` deja la original `cancelled` y crea una `special`; la siguiente generación no recrea la hora original.
- [ ] `move` a un instante pasado o dentro de un bloqueo → 400.
- [ ] `assign-coach` con `apply_to_future` actualiza solo sesiones futuras `scheduled` de esa plantilla y devuelve el conteo.
- [ ] `bun run build:ts` genera los `.pb.js` sin errores.

## Referencias

- `features/009-horarios-y-clases/spec.md`, "Contrato HTTP" y "Flujos Críticos" 1, 3, 4.
- https://pocketbase.io/docs/js-routing/
- https://pocketbase.io/docs/js-jobs-scheduling/
- https://pocketbase.io/docs/js-database/ (transacciones)

## Fuera de alcance

- Cancelación de reservas y notificación (features 011 y 018, vía el evento documentado); UI (006-008).

## Notas de implementación

<!-- Vacío al crear la tarea. -->
