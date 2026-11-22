# 001 - [Migración] Colección `services`

- **Prioridad:** 1
- **Estado:** Completado
- **Depende de:** Feature 005 (contrato)
- **Fase:** Fase 1: Esquema y datos

## Objetivo

PocketBase tiene la colección `services` con su esquema, índices y reglas de API, y la migración se puede revertir.

## Contexto

`api/pb_migrations/` contiene `1795260741_updated_admins.js` y `1795260843_created_admins.js` (estilo `migrate((app) => {...}, (app) => {...})`); las features 005-007 añaden migraciones con timestamps mayores. Las reglas usan el rol `owner` y el filtro staff del contrato. Antes de escribir, ejecutar `ls api/pb_migrations` para elegir un timestamp mayor que el último y leer las dos migraciones existentes para copiar la sintaxis vigente de `Collection`, `fields` e `indexes` (`./pb --version` en `api/`).

## Alcance

- Crear `api/pb_migrations/<timestamp>_created_services.js` con la colección base `services`: `name`, `slug`, `kind` (select `group`|`personal`|`online`), `description`, `capacity`, `default_coach` (relation → `admins`, un valor, sin `cascadeDelete`), `cancellation_hours`, `active` (por defecto `true`), `sort`, más autodates `created`/`updated`.
- Validaciones de campo: `slug` con patrón `^[a-z0-9]+(-[a-z0-9]+)*$`; `capacity` entero ≥ 0; `cancellation_hours` entero 0-168 (`onlyInt`, `min`, `max`).
- Índices: único sobre `slug`; sobre (`active`, `sort`).
- Reglas: `listRule`/`viewRule` = `@request.auth.collectionName = "admins" && @request.auth.active = true`; `createRule`/`updateRule`/`deleteRule` = lo anterior más `&& @request.auth.role = "owner"`.
- `down`: elimina la colección `services` (si existe).
- Límites: no crea `plans` (002) ni datos (004).

## Criterios de aceptación

- [x] Con una base limpia, PocketBase arranca y `services` aparece en `/_/` con los campos, índices y reglas indicados.
- [x] Un token de `coach` puede listar pero recibe rechazo al crear; un token de `owner` puede crear.
- [x] Un segundo `slug` igual falla por el índice único.
- [x] La migración `down` elimina la colección sin error y `up` puede volver a aplicarse.
- [x] No hay reglas con `""`.

## Referencias

- `features/008-catalogo-de-servicios-y-planes/spec.md`, sección "Modelo de datos" → `services`.
- `api/pb_migrations/1795260843_created_admins.js` (estilo de migración).
- https://pocketbase.io/docs/js-migrations/
- https://pocketbase.io/docs/api-rules-and-filters/

## Fuera de alcance

- Colección `plans` (tarea 002), datos iniciales (004) y validaciones por hook (005).

## Notas de implementación

Verificada en PocketBase 0.40.5 con una base temporal. La API de colecciones confirmó campos, índices y reglas. Se probó lectura como coach, escritura como owner, slug duplicado y migración down/up. El valor inicial de active se aplica en el hook de creación de la tarea 005, ya que BoolField carece de un valor predeterminado configurable.
