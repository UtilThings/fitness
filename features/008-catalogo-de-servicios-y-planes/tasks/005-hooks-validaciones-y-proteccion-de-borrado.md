# 005 - [Hook] Validaciones, desactivación en cascada y protección de borrado

- **Prioridad:** 5
- **Estado:** Pendiente
- **Depende de:** 002, 003, Feature 005 (contrato)
- **Fase:** Fase 2: Reglas de servidor

## Objetivo

El servidor impone las reglas del catálogo aunque se salte la UI: validaciones por campo, una sola `is_first_class`, planes activos solo con servicio activo, cascada de desactivación y borrado protegido.

## Contexto

Los hooks viven en `api/src/hooks/*.ts` y compilan a `api/pb_hooks/*.pb.js` (`bun run build:ts`); en goja cada callback debe hacer su propio `require(`${__hooks}/lib/catalog`)`. La feature 005 aporta el helper de auditoría y `api/src/lib/audit-config.ts` (lista de colecciones auditadas). Dependientes posibles: `plans`, `class_templates`, `class_sessions` (009), `memberships` (013), `payments` (014); algunas aún no existen y deben ignorarse. Verificar los nombres de eventos disponibles en la versión de PocketBase fijada (`onRecordValidate`, `onRecordCreateRequest`, `onRecordUpdateRequest`, `onRecordDeleteRequest`, `onRecordAfterUpdateSuccess`).

## Alcance

- Crear `api/src/hooks/catalog.ts`:
  - Validación de `services` y `plans` con `validateService`/`validatePlan`, devolviendo `ValidationError` con errores por campo.
  - `is_first_class`: si el registro la marca, buscar otro plan con la marca (excluyendo el propio id) y rechazar con «Ya existe un plan de primera clase».
  - Plan activo requiere servicio activo: al crear o activar, cargar el servicio y rechazar con «El servicio está inactivo» si `active = false`.
  - `onRecordAfterUpdateSuccess` de `services`: si `active` pasa de `true` a `false`, poner `active = false` en sus planes activos y registrar una entrada de auditoría `custom` con el resumen.
  - `onRecordDeleteRequest` de `services` y `plans`: contar dependientes con una lista declarativa `[{collection, field}]` (ignorando colecciones inexistentes) y rechazar con `dependentsBlockMessage` («desactívalo en su lugar») usando `BadRequestError`.
- Modificar `api/src/lib/audit-config.ts` (feature 005) para registrar `services` y `plans`.
- Pruebas: la lógica ya está cubierta en `catalog.test.ts` (tarea 003); añadir casos a ese archivo si surge lógica nueva (p. ej. cálculo de qué planes desactivar). La integración se comprueba en la tarea 009.
- Límites: sin cambios de UI; la reactivación de planes tras reactivar el servicio es manual.

## Criterios de aceptación

- [ ] Crear un segundo plan con `is_first_class` devuelve 400 con error en el campo; editar el existente sigue funcionando.
- [ ] `price_cents = -5` y un plan pagado con precio 0 devuelven 400.
- [ ] Activar un plan de un servicio inactivo devuelve 400.
- [ ] Desactivar un servicio deja sus planes en `active = false` y genera una entrada en `audit_logs`.
- [ ] `DELETE` de un servicio con planes y de un plan con membresías (cuando exista `memberships`) devuelve 400 con mensaje de desactivar; sin dependientes, borra y audita.
- [ ] Las colecciones inexistentes no rompen el borrado.
- [ ] `bun run build:ts` y `bun test` pasan.

## Referencias

- `features/008-catalogo-de-servicios-y-planes/spec.md`, "Reglas de negocio" y "Flujos Críticos" 2-4.
- `api/pb_hooks/users.pb.js` (patrón de hook y `require` con `__hooks`).
- https://pocketbase.io/docs/js-event-hooks/
- https://pocketbase.io/docs/js-records/

## Fuera de alcance

- UI (006-008) y reglas de dependientes de horarios, membresías o pagos más allá de contar registros existentes.

## Notas de implementación

<!-- Vacío al crear la tarea. -->
