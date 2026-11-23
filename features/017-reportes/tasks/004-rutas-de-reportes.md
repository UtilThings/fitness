# 004 - [Endpoint] Rutas `GET /api/admin/reports/*`

- **Prioridad:** 4
- **Estado:** Completado
- **Depende de:** 002, 003, Feature 005 (contrato)
- **Fase:** Fase 2: API

## Objetivo

La API expone `occupancy`, `attendance`, `revenue` y `retention` con validación de parámetros y permisos por rol: ingresos solo para `owner`, el resto para staff activo.

## Contexto

Los hooks TypeScript viven en `api/src/hooks/*.ts` y compilan con `bun run build:ts` a `api/pb_hooks/*.pb.js`. En goja no hay scope compartido: dentro de cada callback hay que hacer ``require(`${__hooks}/lib/reports-attendance`)``. La regla "staff" y "owner" sale del contrato (`@request.auth.collectionName = "admins" && active = true`; owner añade `role = "owner"`); 005 aporta el helper de roles que debe reutilizarse. Las reglas de las colecciones leídas no se modifican: las rutas leen con acceso interno de `$app`.

## Alcance

- Crear `api/src/hooks/reports.ts` con cuatro `routerAdd("GET", "/api/admin/reports/<kind>", handler, $apis.requireAuth("admins"))`.
- Validar `from`, `to`, `service` (existe en `services`) y `group_by` con `parseRange`; errores `ReportRangeError` → `400` (`BadRequestError`) en español.
- Control de rol dentro del handler: staff (`active = true`) en `occupancy`, `attendance`, `retention`; owner en `revenue` (`403` si no).
- Cargar solo lo necesario para el rango UTC con filtros enlazados (`{:start}`, `{:end}`); para ocupación y asistencia, sesiones por `starts_at` y reservas por `session`; para ingresos, `payments` por `paid_at` (y pendientes/anulados por `created`/`due_on` si el contrato de 014 lo permite); para retención, `memberships` (con su `ended_on` para las bajas). Serializar a objetos planos y delegar en la librería.
- Las respuestas no incluyen datos personales de clientes (solo ids de sesión, nombres de servicio, plan y coach).
- Añadir a `scripts/verify-api.sh` (de 005) las comprobaciones: sin token → `401`/`403`; coach en `revenue` → `403`; owner en `revenue` → `200`; coach en `occupancy` → `200`; rango invertido → `400`.
- Antes de decidir la estrategia de carga, verificar el límite de `findRecordsByFilter` y paginar si hace falta.

## Criterios de aceptación

- [x] Las cuatro rutas responden con el contrato del spec (`range` + cuerpo del reporte) con token de owner.
- [x] Coach y reception reciben `403` en `revenue`; coach recibe `200` en las demás; sin token, `401`/`403`.
- [x] `from`/`to` ausentes, invertidos o con más de 366 días, `service` inexistente y `group_by` inválido devuelven `400` con mensaje en español.
- [x] Un rango sin datos devuelve `200` con totales en cero.
- [x] Ninguna respuesta contiene nombre, correo ni teléfono de clientes.
- [x] `bun run build:ts`, `bun test` y `scripts/verify-api.sh` pasan en verde.

## Referencias

- `features/017-reportes/spec.md`, sección "Fase 2" → tarea 004.
- `api/src/lib/reports-*.ts` (tareas 001-003).
- https://pocketbase.io/docs/js-routing/
- https://pocketbase.io/docs/js-database/

## Fuera de alcance

- Cambios en reglas o esquemas de colecciones.
- Caché de respuestas.
- Interfaz (006-008).

## Notas de implementación

Se reutilizó requireBookingStaff. Las consultas filtran los registros en PocketBase con parámetros enlazados y límite 0. La fecha de anulación se usa cuando el pago anulado carece de vencimiento. verify-api.sh confirmó los contratos, permisos, privacidad y el límite de un día de 23 horas.
