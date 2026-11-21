# 006 - [Endpoint] Vista previa, mensaje manual a una clase y envío de prueba

- **Prioridad:** 6
- **Estado:** Pendiente
- **Depende de:** 002, 004, Feature 005 (contrato)
- **Fase:** Fase 3: Hooks

## Objetivo

El staff puede previsualizar una plantilla, enviar un mensaje manual a los inscritos de una clase y el owner puede enviar un correo de prueba para validar el SMTP.

## Contexto

Las rutas custom se registran con `routerAdd` en `api/src/hooks/*.ts` (compilan a `pb_hooks/*.pb.js`), con `$apis.requireAuth("admins")` y comprobación de rol dentro del handler (helper de 005). El contrato de las rutas está en el spec. Los mensajes manuales son operativos (p. ej. «la clase se mueve de sala»), no promocionales.

## Alcance

- Crear `api/src/hooks/messages-admin.ts` con:
  - `POST /api/admin/messages/preview` (staff): valida y renderiza `{ key, locale, subject, body }` con datos de ejemplo; devuelve `{ subject, body, html, unknown_variables }` sin enviar nada.
  - `POST /api/admin/messages/class/{sessionId}` (staff): `{ subject, body, locale? }`; destinatarios = reservas `booked` y `waitlisted` de la sesión; usa solo las variables comunes de `manual`; respeta `isEligible`; tope de 200 destinatarios; cada envío se registra con `template_key = manual` y `session`; responde `{ sent, failed, skipped }`.
  - `POST /api/admin/messages/test` (owner): envía la plantilla indicada con datos de ejemplo al correo del admin autenticado; `400` si el SMTP no está configurado.
- Validación de cuerpo con `400` y mensajes en español; sesión inexistente `404`, cancelada o pasada `400`.
- Añadir a `scripts/verify-api.sh`: preview con variable no permitida → `400`; coach en `test` → `403`; mensaje manual sin token → `401`/`403`.

## Criterios de aceptación

- [ ] `preview` devuelve el HTML escapado y lista las variables desconocidas sin enviar nada.
- [ ] El mensaje manual llega solo a los inscritos de la clase indicada y se omite a clientes `inactive` (contados en `skipped`).
- [ ] Cada destinatario del mensaje manual tiene un `message_logs` con `template_key = manual` y la `session`.
- [ ] Reception y coach reciben `403` en `test`; sin sesión, `401`/`403` en todas.
- [ ] Más de 200 destinatarios, clase inexistente o cuerpo vacío devuelven el error previsto.
- [ ] `bun run build:ts` y `scripts/verify-api.sh` pasan en verde.

## Referencias

- `features/018-comunicaciones-del-servicio/spec.md`, sección "Contrato HTTP" y "Fase 3" → tarea 006.
- https://pocketbase.io/docs/js-routing/

## Fuera de alcance

- Interfaz (007, 008).
- Mensajes a clientes que no estén inscritos en la clase o a todos los clientes (no hay difusiones masivas).

## Notas de implementación

