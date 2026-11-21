# 008 - [Hook] Hook genérico de auditoría

- **Prioridad:** 8
- **Estado:** Pendiente
- **Depende de:** 001, 002, 007
- **Fase:** Fase 2

## Objetivo

Cada create, update y delete de una colección listada en `AUDITED_COLLECTIONS` deja una fila en `audit_logs` con su actor.

## Contexto

En goja no hay scope compartido: dentro de cada callback hay que hacer `require(`${__hooks}/lib/audit-config`)`. Los hooks `*AfterSuccess` se ejecutan tras persistir y reciben `e.record` y `e.auth`; en update, `e.record.original()` da el estado previo. Tras la tarea 001 existe `hooks/admins.ts`; este hook es independiente.

## Alcance

- Crear `api/src/hooks/audit.ts` con `onRecordAfterCreateSuccess`, `onRecordAfterUpdateSuccess` y `onRecordAfterDeleteSuccess` sin filtro de colección; en cada callback: `require` de `audit-config` y `audit`, `isAudited(e.record.collection().name)`, convertir con `e.record.publicExport()` o `e.record.original().publicExport()` para el estado previo (en delete, el registro eliminado como `before`), `buildEntry`, y guardar con `e.app.save(new Record(e.app.findCollectionByNameOrId("audit_logs"), data))`.
- Actor: `e.auth` si su colección es `admins`; si no, vacío.
- Si `buildEntry` devuelve `null` (update sin cambios) no se guarda nada.
- Un error al guardar se registra con `e.app.logger().error(...)` y no interrumpe la operación; siempre `return e.next()`.
- Comprobación manual documentada en las notas: alta, edición y baja de un admin de prueba.

## Criterios de aceptación

- [ ] Crear, editar y borrar un admin genera tres filas con `action` correcto, `actor` del owner que operó y `diff` sin campos sensibles.
- [ ] Una edición que no cambia nada no genera fila.
- [ ] Operar sobre `audit_logs` no genera filas (sin recursión).
- [ ] Si `audit_logs` fallara al guardar, la operación original igualmente termina bien y queda un error en los logs.
- [ ] `bun run build:ts` y `bun test` pasan.

## Referencias

- `features/005-api-fundamentos-roles-y-auditoria/spec.md`, sección "Fase 2" → tarea 008.
- https://pocketbase.io/docs/js-event-hooks/
- https://pocketbase.io/docs/js-records/

## Fuera de alcance

- Visor de auditoría en la app.
- Registrar colecciones de otras features (cada una edita `audit-config.ts`).

## Notas de implementación

