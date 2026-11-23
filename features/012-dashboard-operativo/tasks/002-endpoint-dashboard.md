# 002 - [Endpoint] GET /api/admin/dashboard

- **Prioridad:** 2
- **Estado:** Completado
- **Depende de:** 001
- **Fase:** Fase 1: Resumen operativo en la API

## Objetivo

El personal staff obtiene en una sola llamada el resumen operativo del día con la zona horaria correcta.

## Contexto

Las rutas custom se registran con `routerAdd` en `api/src/hooks/*.ts` (compilan a `pb_hooks/*.pb.js`); en goja cada handler hace `require(`${__hooks}/lib/dashboard`)`. El patrón `/api/admin/...` con staff lo fija la feature 005. La ruta lee `class_sessions`, `bookings`, `clients`, `services` y `admins` en solo lectura.

## Alcance

- Crear `api/src/hooks/dashboard.ts`: `GET /api/admin/dashboard?days=7`.
  - Validar `days` (1-14, por defecto 7) → `400` si no.
  - Calcular el día local con `localDayBoundsUtc(new Date(), 'America/New_York')`.
  - Cargar sesiones del día y de la ventana de atención con `expand` de `service` y `coach`, reservas de esas sesiones en una consulta, y el conteo de clientes `active`.
  - Responder con la estructura del contrato (`counts`, `sessions_today`, `attention`, `upcoming_payments: null`).
- Solo staff (`apis.requireAuth("admins")` y comprobación de `active`); sin sesión `401`.
- Sin consultas N+1: máximo cinco consultas por llamada.

## Criterios de aceptación

- [x] La respuesta cumple el contrato y `timezone = "America/New_York"`.
- [x] Una sesión a las 23:30 locales aparece en `sessions_today` de ese día y no del siguiente.
- [x] Una sesión sin coach y otra sin reservas aparecen en `attention` con su `reason`.
- [x] `days=0` o `days=30` devuelve `400`; sin token `401`; un coach activo recibe `200`.
- [x] La respuesta no incluye datos personales de clientes.
- [x] `bun run build:ts` genera el hook y `bun test` pasa.

## Referencias

- `features/012-dashboard-operativo/spec.md`, sección "Contrato HTTP" → "Respuesta de `/api/admin/dashboard`".
- https://pocketbase.io/docs/js-routing/

## Fuera de alcance

- Interfaz (003, 004); `upcoming_payments` (014).

## Notas de implementación


- Verificado contra PocketBase temporal con `scripts/verify-api.sh`: permisos, límites de days, clases de las 23:30 en días contiguos, alertas y ausencia de datos de clientes. La consulta usa como máximo cinco lecturas de datos, incluidas las dos expansiones por lote.
