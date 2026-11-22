# 003 - [Hook] Hooks de la colección clients

- **Prioridad:** 3
- **Estado:** Completado
- **Depende de:** 001, 002, Feature 005 (contrato)
- **Fase:** Fase 1: Modelo de datos y reglas

## Objetivo

La API de `clients` aplica normalización, validaciones y protecciones (clase gratis, borrado con historial) y registra cada cambio en `audit_logs`.

## Contexto

Los hooks se escriben en `api/src/hooks/clients.ts` y compilan a `api/pb_hooks/clients.pb.js`. En goja no hay scope compartido: dentro de cada callback hay que hacer `require(`${__hooks}/lib/clients`)`. Los guardados internos (`$app.save`) no pasan por los hooks `onRecord*Request`, lo que permite a la feature 011 marcar `free_class_used` desde el sistema. El helper de auditoría de 005 y la lista `audit-config.ts` ya existen según el contrato. Las colecciones `bookings`, `memberships`, `payments` y `coaching_programs` pueden no existir todavía.

## Alcance

- Crear `api/src/hooks/clients.ts`:
  - `onRecordCreateRequest("clients")` y `onRecordUpdateRequest("clients")`: normalizar `email` y `phone` con la lib (error `400` por campo si no son válidos), validar `assessment`, comprobar `canChangeFreeClass` con `e.auth.get("role")` si `free_class_used` cambia, completar `joined_on` con la fecha local del negocio si falta (helper de zona horaria de 009 si existe; si no, fecha UTC-5/-4 resuelta por la lib de la feature 009).
  - `onRecordDeleteRequest("clients")`: si existen registros en `bookings`, `memberships`, `payments` o `coaching_programs` que apunten al cliente, devolver `409` «El cliente tiene historial; inactívalo en su lugar». Cada colección se resuelve con `findCollectionByNameOrId` en `try/catch`.
  - Auditoría con el helper de 005 en alta, edición y borrado (el diff de `assessment` incluido).
- Siempre `e.next()` salvo rechazo explícito.
- Pruebas: la lógica ya está cubierta en 002; verificar manualmente con `curl` y dejar los casos listados en los criterios.

## Criterios de aceptación

- [x] Crear con `Ana@Example.com` y `(305) 555-0100` guarda `ana@example.com` y `+13055550100`.
- [x] Email duplicado (con distinta capitalización) devuelve `400`.
- [x] PATCH de `free_class_used` con un coach o recepcionista devuelve `400`; con el owner devuelve `200`.
- [x] Un `assessment` inválido devuelve `400` con `data.assessment`.
- [x] Borrar un cliente sin historial como owner funciona; con un registro dependiente devuelve `409`; un no-owner recibe `403`.
- [x] Cada operación crea una fila en `audit_logs` con el actor.
- [x] `bun run build:ts` genera `pb_hooks/clients.pb.js` y `bun test` pasa.

## Referencias

- `features/010-clientes/spec.md`, sección "Fase 1" → tarea 003.
- `api/src/lib/clients.ts` (tarea 002) y helper de auditoría de la feature 005.
- https://pocketbase.io/docs/js-event-hooks/
- https://pocketbase.io/docs/js-records/

## Fuera de alcance

- Marcar `free_class_used` al reservar (011).
- Interfaz de usuario (004-006).

## Notas de implementación


Verificado por HTTP en una base temporal con owner, coach y recepción: normalización, duplicado, errores por campo, transiciones, borrado con y sin relación y auditoría con su actor y diff de evaluación. PocketBase devuelve 404 por defecto si no se cumple deleteRule; el middleware de clientes devuelve el 403 acordado.
