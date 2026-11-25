# 022 - [Hooks] Mensajes en inglés del API: clientes, membresías, pagos, coaching, mensajes y reportes

- **Prioridad:** 22
- **Estado:** Pendiente
- **Depende de:** 019
- **Fase:** Fase 4: Mensajes del API

## Objetivo

Los mensajes de error y las descripciones de auditoría de este grupo de archivos están en inglés, son estáticos y están cubiertos por pruebas.

## Contexto

Archivos del alcance: `hooks/clients.ts`, `memberships.ts`, `memberships-cron.ts`, `payments.ts`, `payments-charges.ts`, `coaching.ts`, `messages.ts`, `messages-admin.ts`, `messages-triggers.ts`, `dashboard.ts`, `reports.ts` y `lib/clients.ts`, `client-request.ts`, `memberships-service.ts`, `credits.ts`, `payments-*.ts`, `coaching.ts`, `message-*.ts`, `reports-*.ts`, `dashboard.ts`. Las plantillas de correo semilla (`pb_migrations/*seeded_message_templates*`) no cambian. Los hooks corren en goja desde `api/pb_hooks/*.pb.js` compilados con `api/src/build.ts`; no se edita `pb_hooks/` a mano. La convención sale del inventario de la tarea 019.

## Alcance

- Reescribir en inglés, siguiendo la convención de 019, los mensajes de `ForbiddenError`, `BadRequestError`, `NotFoundError`, `fieldError` y `ValidationError` de los archivos del alcance; los valores dinámicos pasan a `data` o se eliminan del texto.
- Las descripciones de auditoría nuevas se escriben en inglés y estáticas (los datos variables van en el campo de metadatos).
- No cambiar códigos HTTP, códigos de error ni nombres de campo.
- Actualizar pruebas unitarias del API y las aserciones de `scripts/verify-*.ts` afectadas.
- Registrar en `docs/i18n.md` la lista final de mensajes (insumo de 023).

## Criterios de aceptación

- [ ] `cd api && bun test` y `bun run build` pasan en verde; `api/pb_hooks/` regenerado.
- [ ] Ningún texto de usuario en español queda en los archivos del alcance (`grep -P '[áéíóúñ¿¡]'` sin coincidencias en cadenas de mensajes).
- [ ] Códigos HTTP y `code` de errores sin cambios.
- [ ] Los `scripts/verify-*.ts` relacionados terminan en verde.

## Referencias

- `features/021-internacionalizacion-app/spec.md`, «Fase 4».
- https://pocketbase.io/docs/js-event-hooks/

## Fuera de alcance

- Traducción en el app (023); migración de `audit_logs` históricos (fuera de alcance).

## Notas de implementación

