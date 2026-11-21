# 001 - [Lib] Tipos TypeScript de colecciones

- **Prioridad:** 1
- **Estado:** Pendiente
- **Depende de:** Feature 005 (contrato)
- **Fase:** Fase 1

## Objetivo

Existe `src/types/pb.ts` con los tipos base de PocketBase y de `admins` y `audit_logs`, listo para que cada feature añada los suyos.

## Contexto

`app` usa el SDK `pocketbase` (`pb` en `src/lib/pocketbase.ts`) y `useAuth` tipa `user` como `AuthRecord` (sin campos conocidos). Contrato de campos: `admins` = `name`, `avatar`, `email`, `role`, `active`; `audit_logs` = `actor`, `action`, `collection`, `record_id`, `summary`, `diff`, `created`. Las fechas se manejan como string ISO UTC.

## Alcance

- Crear `app/src/types/pb.ts` con `Role`, `ROLES` (array constante para validar), `BaseRecord`, `Admin`, `AuditLog` y `PbList<T>` (alias de `ListResult<T>` del SDK).
- Documentar en comentario la convención: una interfaz por colección, snake_case, relaciones como `string` id y `expand?` tipado opcionalmente, fechas ISO UTC.
- Prueba mínima `src/types/pb.test.ts` que verifique que `ROLES` contiene exactamente `owner`, `coach`, `reception`.

## Criterios de aceptación

- [ ] `bun run typecheck` y `bun run test` pasan.
- [ ] Los tipos se importan con `@/types/pb` sin errores.

## Referencias

- `features/006-app-base-de-modulos/spec.md`, sección "Fase 1" → tarea 001.
- Contrato de datos en `features/005-api-fundamentos-roles-y-auditoria/spec.md`.
- https://github.com/pocketbase/js-sdk

## Fuera de alcance

- Tipos del resto de colecciones (cada feature añade el suyo).
- Uso de los tipos en `useAuth` (tarea 004).

## Notas de implementación

