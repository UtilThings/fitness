# 001 - [Migración] Colecciones `class_templates`, `class_sessions` y `schedule_blocks`

- **Prioridad:** 1
- **Estado:** Completado
- **Depende de:** Feature 008 (contrato), Feature 005 (contrato)
- **Fase:** Fase 1: Esquema y datos

## Objetivo

PocketBase tiene las tres colecciones de horarios con sus relaciones, reglas e índices (incluido el único parcial que sostiene la generación idempotente), todas reversibles.

## Contexto

`api/pb_migrations/` tiene hoy `1795260741_updated_admins.js` y `1795260843_created_admins.js`; las features 005-008 añaden migraciones posteriores, por lo que hay que ejecutar `ls api/pb_migrations` y usar timestamps mayores. `services` (feature 008) y `admins` con `role` (005) existen por contrato. Antes de escribir, comprobar en la versión de PocketBase fijada (`./pb --version` en `api/`) la sintaxis de un índice con `WHERE` en `indexes` (p. ej. `CREATE UNIQUE INDEX idx_sessions_template_start ON class_sessions (template, starts_at) WHERE template != ''`) y que un campo `number` con valor `0` (domingo) no debe marcarse `required`.

## Alcance

- Crear tres migraciones en `api/pb_migrations/` (orden de timestamps: templates, sessions, blocks), cada una con `up` y `down`:
  - `<ts>_created_class_templates.js`: `service`, `weekday` (entero 0-6), `start_time` (patrón `HH:mm`), `duration_min` (15-240), `coach`, `capacity` (≥ 1), `active`; índice único (`service`, `weekday`, `start_time`).
  - `<ts>_created_class_sessions.js`: `template`, `service`, `starts_at` (date), `duration_min`, `coach`, `capacity`, `status` (`scheduled`|`cancelled`|`completed`), `kind` (`regular`|`special`|`private`), `cancel_reason`, `notes`; índices único parcial (`template`, `starts_at`), `starts_at` y (`service`, `starts_at`).
  - `<ts>_created_schedule_blocks.js`: `title`, `date_from`, `date_to` (texto con patrón `YYYY-MM-DD`), `reason`; índice (`date_from`, `date_to`).
- Todas las relaciones sin `cascadeDelete`.
- Reglas: lectura staff en las tres; `class_templates` y `schedule_blocks` escriben solo owner; `class_sessions` crea/actualiza owner o reception y `deleteRule` = `null`.
- `down` elimina cada colección en orden inverso (sessions antes que templates).
- Límites: sin datos (002) ni validaciones (004).

## Criterios de aceptación

- [x] Las tres colecciones aparecen en `/_/` con campos, índices y reglas indicados.
- [x] Insertar dos sesiones con la misma plantilla y `starts_at` falla; dos sesiones `special` sin plantilla en el mismo instante no fallan por el índice.
- [x] Una plantilla con `weekday: 0` se guarda sin error.
- [x] Un `coach` solo lee; un `reception` puede crear sesiones pero no plantillas; nadie borra sesiones por API.
- [x] `down` revierte las tres sin error y `up` vuelve a aplicarse.

## Referencias

- `features/009-horarios-y-clases/spec.md`, sección "Modelo de datos".
- `api/pb_migrations/1795260843_created_admins.js` (estilo).
- https://pocketbase.io/docs/js-migrations/
- https://pocketbase.io/docs/api-rules-and-filters/

## Fuera de alcance

- Seed de plantillas (002), hooks y validaciones (004).

## Notas de implementación

Verificado con PocketBase 0.40.5. La API de colecciones confirmó campos, reglas e índices. Se comprobó un domingo, el índice parcial con sesiones regulares y especiales, los permisos de los tres roles y el ciclo `up → down 3 → up` en una base temporal.
