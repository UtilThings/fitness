# 008 - [Vista] Pestaña Pagos en el perfil del cliente y "cobros por vencer" en el dashboard

- **Prioridad:** 8
- **Estado:** Completado
- **Depende de:** 005, 006, 007
- **Fase:** Fase 4: Interfaz

## Objetivo

El perfil del cliente muestra su historial de pagos y el dashboard operativo muestra datos reales de cobros por vencer.

## Contexto

El perfil de cliente (010) usa pestañas y el dashboard (012) deja una tarjeta "cobros por vencer" inactiva (marcador); verificar los nombres reales de archivos y del marcador en `app/src/views/admin/` y `components/` antes de editar. Los coaches no tienen acceso a pagos: la pestaña y la tarjeta se ocultan para ese rol.

## Alcance

- Pestaña "Pagos" en el perfil del cliente: lista de pagos del cliente, total pagado, pendientes/vencidos, acciones de registrar pago y ver recibo.
- Dashboard (012): sustituir el marcador "cobros por vencer" por una tarjeta con `usePaymentsDue` (conteo y monto de vencidos y por vencer, y enlace a `/payments?overdue=1`); visible solo para `owner` y `reception`.
- `PaymentsView` debe leer `overdue` y `client` desde `route.query` para esos enlaces.
- Pruebas Vitest: la pestaña (render, filtro por cliente), la tarjeta (estados vacío/con datos, oculta para coach) y el parseo de query.

## Criterios de aceptación

- [x] La pestaña Pagos lista solo los pagos del cliente y permite registrar uno nuevo preseleccionando al cliente.
- [x] La tarjeta del dashboard muestra los totales reales y enlaza a la vista filtrada.
- [x] Un coach no ve la pestaña ni la tarjeta.
- [x] `bun run test`, `lint`, `format:check`, `typecheck` y `build` pasan.

## Referencias

- `features/014-pagos-y-recibos/spec.md`, "Fase 4" → tarea 008.

## Fuera de alcance

- Otras tarjetas del dashboard; reportes (017).

## Notas de implementación

Chromium verificó el historial de un cliente, el alta con cliente preseleccionado, los enlaces filtrados del dashboard y el acceso por rol. El selector conserva el cliente al mover el foco hacia otros filtros.
