# 006 - [Composable] useCollection y traducción de errores de PocketBase

- **Prioridad:** 6
- **Estado:** Pendiente
- **Depende de:** 001, 003
- **Fase:** Fase 3

## Objetivo

Cualquier módulo puede listar con paginación, orden y filtros, y crear, editar o borrar con errores legibles usando un solo composable.

## Contexto

`pb` (`src/lib/pocketbase.ts`) es la instancia del SDK. Los errores del SDK son `ClientResponseError` con `status`, `response.message` y `response.data[campo].message`. Las peticiones concurrentes del SDK se auto-cancelan por `requestKey`; las búsquedas rápidas del usuario no deben mostrar errores por cancelación.

## Alcance

- Crear `app/src/lib/pb-errors.ts`: `parsePbError(error)` → `{ message, fields, status }` (400 con `data` → mensajes por campo; 403 «No tienes permiso»; 404; 409 u otros con el mensaje de la API; `status 0` → «Sin conexión con el servidor»; las cancelaciones se señalan con `aborted: true`).
- Crear `app/src/composables/useCollection.ts`: `useCollection<T>(name, { perPage, sort, expand, fields, baseFilter })` devolviendo `items`, `total`, `page`, `perPage`, `sort`, `filters` (reactivo), `loading`, `error`, `load()`, `setPage`, `setSort`, `search(text, fields)`, `create(data)`, `update(id, data)`, `remove(id)`. Los filtros usan `pb.filter(expr, params)`; `create/update/remove` lanzan el error ya traducido por `parsePbError` y recargan la lista; `load` usa un `requestKey` propio por instancia.
- Pruebas con `pb` mockeado: paginación, orden, filtro parametrizado (sin interpolación), error 400 con campos, `remove`, cancelación ignorada.

## Criterios de aceptación

- [ ] Una instancia lista registros con `page`, `perPage` y `total` correctos y cambia de página y orden.
- [ ] Buscar un texto con comillas no rompe el filtro (parametrizado).
- [ ] Un 400 con errores de campos llega como `fields` por campo; un 403 como mensaje de permiso.
- [ ] Las cancelaciones de peticiones no producen `error` visible.
- [ ] `bun run typecheck`, `lint`, `test` pasan.

## Referencias

- `features/006-app-base-de-modulos/spec.md`, sección "Fase 3" → tarea 006.
- https://github.com/pocketbase/js-sdk#error-handling
- https://pocketbase.io/docs/api-rules-and-filters/

## Fuera de alcance

- Componentes de interfaz (tarea 007).
- Caché entre vistas, estado global o librerías de datos (descartado).

## Notas de implementación

