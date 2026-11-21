# 003 - [Hook] Protección de admins en actualización y borrado

- **Prioridad:** 3
- **Estado:** Pendiente
- **Depende de:** 001, 002
- **Fase:** Fase 1

## Objetivo

La API rechaza dejar al equipo sin owner, la auto-desactivación y el borrado de admins con registros asociados.

## Contexto

`api/src/hooks/admins.ts` (feature 005) ya registra `onRecordCreate` con valores por defecto. Este hook se amplía con `onRecordUpdateRequest` y `onRecordDeleteRequest` filtrados a `admins`. Verificar antes en `api/pb` que el JSVM expone `ApiError`/`BadRequestError`, `findRecordsByFilter` y `findCollectionByNameOrId`.

## Alcance

- Ampliar `api/src/hooks/admins.ts`: en `onRecordUpdateRequest("admins")` leer `e.record.original()`, contar owners activos (`e.app.countRecords("admins", ...)` con `$dbx.hashExp({ role: "owner", active: true })`), llamar a `checkAdminChange` con `e.auth?.id` y lanzar `new BadRequestError(message)` si devuelve resultado; siempre `return e.next()` en caso contrario.
- En `onRecordDeleteRequest("admins")`: sumar referencias de `ADMIN_REFERENCES` (ignorando colecciones inexistentes), calcular `isLastOwner` e `isSelf` y lanzar `new ApiError(409, message, {})` cuando `canDeleteAdmin` lo indique.
- Dentro de cada callback `require(`${__hooks}/lib/team-guards`)`.
- Documentar en las notas las pruebas manuales: último owner (desactivar, degradar, borrar), auto-desactivación, borrado de un admin con filas en `audit_logs` → 409, borrado de uno sin referencias.

## Criterios de aceptación

- [ ] Desactivar o degradar al único owner devuelve `400` con el mensaje esperado.
- [ ] Un owner no puede desactivarse a sí mismo (`400`); desactivar a otro owner cuando hay otro activo funciona.
- [ ] Borrar un admin con filas en `audit_logs` devuelve `409`; uno sin referencias se borra.
- [ ] Un PATCH que solo cambia `name` no se ve afectado.
- [ ] `bun run build:ts` y `bun test` pasan.

## Referencias

- `features/007-equipo-y-coaches/spec.md`, sección "Fase 1" → tarea 003.
- https://pocketbase.io/docs/js-event-hooks/#record-model-hooks
- https://pocketbase.io/docs/js-database/

## Fuera de alcance

- UI de desactivación y borrado (tarea 006).
- Añadir nuevas referencias (las añaden las features 008, 009, 011 y 014).

## Notas de implementación

