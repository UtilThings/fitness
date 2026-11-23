# 004 - [Hook] Motor de envío, registro y reintentos

- **Prioridad:** 4
- **Estado:** Completado
- **Depende de:** 001, 002, 003, Feature 005 (contrato)
- **Fase:** Fase 3: Hooks

## Objetivo

Existe una función de envío que, dado un evento y un cliente, elige la plantilla, la renderiza, envía el correo por el SMTP de PocketBase y registra el resultado, con reintentos automáticos y sin romper nunca la operación que la invocó.

## Contexto

Los hooks TypeScript van en `api/src/hooks/*.ts` y compilan a `api/pb_hooks/*.pb.js`; en goja no hay scope compartido, así que las funciones reutilizables viven en `api/src/lib/` y se cargan con ``require(`${__hooks}/lib/<x>`)`` dentro de cada callback, recibiendo `app` por parámetro. El SMTP se configura en Ajustes > Correo de PocketBase. Antes de escribir: verificar en la versión instalada `app.newMailClient()`, la forma de `MailerMessage` (`from`, `to`, `subject`, `html`, `text`) y `cronAdd`.

## Alcance

- Crear `api/src/lib/message-send.ts` con `sendServiceMessage(app, { key, client, context, dedupeKey, session })`: comprueba elegibilidad (`isEligible`), idioma (`resolveLocale`) y plantilla activa (fallback al otro idioma si falta; si ninguna está activa, se omite sin error), renderiza texto y HTML con `message-render`, envía y escribe `message_logs` (`sent` o `failed` con `error` recortado a 200 caracteres, `attempts`, `next_retry_at` con `nextRetry`). Idempotente por `dedupe_key`.
- Definir `MessageChannel { name; send(message) }` con la implementación `email` y un registro de canales; documentar en el encabezado el punto de extensión para SMS (no se implementa).
- Crear `api/src/hooks/messages.ts` con: cron `retry_failed_messages` (cada 10 min) que reintenta logs `failed` con `next_retry_at` vencido y `attempts < 3`; hook `onRecordCreateRequest`/`onRecordUpdateRequest("message_templates")` que aplica `validateTemplate` y responde `400` con los problemas.
- Añadir `message_templates` a `api/src/lib/audit-config.ts` (de 005).
- Todo fallo se captura y registra (log de PocketBase sin secretos); nunca se relanza.
- Sin disparadores de negocio (005) ni rutas (006).

## Criterios de aceptación

- [x] Con SMTP configurado, `sendServiceMessage` envía y deja un `message_logs` `sent` con el cliente, la clave y el canal `email`.
- [x] Con SMTP caído deja `failed` con `next_retry_at`, y el cron lo reenvía y lo marca `sent` al restaurarse; tras 3 intentos no se reintenta más.
- [x] Llamarla dos veces con el mismo `dedupe_key` envía una sola vez.
- [x] Un cliente `inactive` o sin correo no genera envío ni log de fallo.
- [x] Guardar una plantilla con una variable no permitida devuelve `400`; las ediciones válidas quedan en `audit_logs`.
- [x] `bun run build:ts` y `bun test` pasan en verde.

## Referencias

- `features/018-comunicaciones-del-servicio/spec.md`, sección "Fase 3" → tarea 004.
- `api/src/lib/message-render.ts` y `message-policy.ts` (tareas 002 y 003).
- https://pocketbase.io/docs/js-sending-emails/
- https://pocketbase.io/docs/js-jobs-scheduling/

## Fuera de alcance

- Disparadores por eventos y crons de recordatorios, cobros y renovaciones (005).
- Rutas de administración (006).
- Implementación de SMS u otros canales.

## Notas de implementación

- Verificado con PocketBase y SMTP local de captura, incluido el cron real, el tercer intento terminal y el reclamo concurrente de la misma clave. Los reintentos operativos reconstruyen el contexto a partir de la sesión o del vencimiento, sin guardar el cuerpo.
