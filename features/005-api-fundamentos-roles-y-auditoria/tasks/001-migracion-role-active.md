# 001 - [Migración] Campos role y active en admins con valores por defecto

- **Prioridad:** 1
- **Estado:** Completado
- **Depende de:** Feature 004 (contrato)
- **Fase:** Fase 1

## Objetivo

La colección `admins` tiene `role` y `active`, los admins existentes son `owner` activos y los nuevos reciben valores por defecto.

## Contexto

`api/pb_migrations/` termina en `1795260843_created_admins.js`. `admins` solo tiene `name`, `avatar` y `email`. PocketBase no admite valor por defecto en `select` ni `bool`, y un campo requerido nuevo hace fallar la validación de registros existentes al guardarlos. Los hooks viven en `api/src/hooks/*.ts` y compilan con `bun run build:ts`.

## Alcance

- Crear `api/pb_migrations/1795261000_updated_admins_role_active.js` con `up`: añadir `role` (select `owner`/`coach`/`reception`, `maxSelect` 1, no requerido), recorrer los admins existentes con `app.findAllRecords("admins")` poniendo `role = "owner"` y `active = true`, y luego marcar `role` como requerido; añadir `active` (bool).
- `down`: eliminar `role` y `active`.
- Crear `api/src/hooks/admins.ts` con `onRecordCreate` para `admins`: si `role` está vacío asignar `coach`; si el cuerpo de la petición no incluye `active` asignar `true`. Siempre `return e.next()`.
- Idempotencia: si el campo ya existe la migración no falla.

## Criterios de aceptación

- [x] Con una base que ya tiene un admin, `./pb serve` aplica la migración y el admin queda con `role = owner` y `active = true`.
- [x] Crear un admin sin `role` desde `/_/` guarda `coach`; con `active: false` explícito se respeta `false`.
- [x] `down` deja la colección como estaba.
- [x] `bun run build:ts` genera `pb_hooks/admins.pb.js` sin errores.

## Referencias

- `features/005-api-fundamentos-roles-y-auditoria/spec.md`, sección "Fase 1" → tarea 001.
- `api/pb_migrations/1795260843_created_admins.js`.
- https://pocketbase.io/docs/js-migrations/
- https://pocketbase.io/docs/js-event-hooks/

## Fuera de alcance

- Reglas de API de `admins` (tarea 005).
- Validaciones de "último owner" y borrado protegido (feature 007).

## Notas de implementación


Verificado con PocketBase 0.40.5 en una base temporal: `serve` migró una cuenta existente, las altas por la API del panel aplicaron los valores por defecto y conservaron `active: false`, y `migrate down 1` retiró los dos campos. La presencia de `active` se comprueba en el hook de petición porque el evento de modelo carece de cuerpo HTTP.
