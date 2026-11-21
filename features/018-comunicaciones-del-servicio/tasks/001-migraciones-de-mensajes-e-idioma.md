# 001 - [Migración] Plantillas, registros de mensajes e idioma del cliente

- **Prioridad:** 1
- **Estado:** Pendiente
- **Depende de:** Feature 010 (contrato), Feature 005 (contrato)
- **Fase:** Fase 1: Modelo de datos

## Objetivo

Existen las colecciones `message_templates` y `message_logs`, el campo `clients.locale` y las 12 plantillas por defecto (6 claves × es/en), con reglas cerradas y migraciones reversibles.

## Contexto

Las migraciones son JS en `api/pb_migrations/<timestamp>_<verbo>_<objeto>.js` con `migrate((app) => {...}, (app) => {...})`; la última existente es `1795260843_created_admins.js` y las de 005-017 usan timestamps posteriores: usar uno mayor que todos. `clients` lo crea la feature 010 y `class_sessions` la 009 (por contrato). El modelo de datos exacto, las reglas y las variables permitidas están en el spec. Antes de escribir: comprobar en la versión de PocketBase instalada la API de `app.save(new Collection(...))`, la de campos `SelectField`/`AutodateField` y cómo se añade un campo a una colección existente.

## Alcance

- `<ts>_created_message_templates.js`: colección base con `key`, `locale`, `subject`, `body`, `active`; índice único (`key`,`locale`); `listRule`/`viewRule` staff; `createRule`/`updateRule`/`deleteRule` owner (reglas del contrato).
- `<ts>_created_message_logs.js`: `client`, `template_key` (seis claves + `manual`), `channel` (`email`), `status`, `error`, `created`, más `attempts`, `next_retry_at`, `dedupe_key` (índice único parcial para no vacíos) y `session`; `listRule`/`viewRule` staff; escritura `null`.
- `<ts>_updated_clients_locale.js`: añade `locale` select (`es`|`en`, por defecto `es`) a `clients`; `down` lo elimina.
- `<ts>_seeded_message_templates.js`: inserta las 12 plantillas operativas (confirmación, recordatorio, cancelación, promoción, cobro, renovación) en español e inglés usando solo variables permitidas y sin contenido promocional; idempotente (no sobrescribe ediciones) y `down` borra solo las no modificadas.
- Todas con `up` y `down`; una responsabilidad por archivo.
- Fuera de la migración: no se escribe lógica de envío.

## Criterios de aceptación

- [ ] PocketBase arranca desde cero, aplica las 4 migraciones sin errores y existen 12 plantillas activas.
- [ ] Reiniciar o reaplicar las migraciones no duplica plantillas ni pisa una plantilla editada.
- [ ] `message_templates` rechaza crear/editar con token de coach o reception y con token ausente; `message_logs` rechaza cualquier escritura por API.
- [ ] Insertar dos plantillas con la misma (`key`,`locale`) falla por el índice único; dos logs con la misma `dedupe_key` no vacía también.
- [ ] `down` de cada migración revierte solo lo creado por ella.

## Referencias

- `features/018-comunicaciones-del-servicio/spec.md`, sección "Fase 1" → tarea 001, y "Modelo de datos".
- `api/pb_migrations/1795260843_created_admins.js` (estilo de migración existente).
- https://pocketbase.io/docs/js-migrations/

## Fuera de alcance

- Render y validación (002), envío (004) y auditoría de plantillas (004).
- Formulario de clientes con selector de idioma (008).

## Notas de implementación

