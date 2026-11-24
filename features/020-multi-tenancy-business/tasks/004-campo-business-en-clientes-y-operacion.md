# 004 - [Migración] Campo `business` en clientes, reservas, membresías, pagos y coaching

- **Prioridad:** 4
- **Estado:** Pendiente
- **Depende de:** 003
- **Fase:** Fase 1: Fundamentos de datos y aislamiento

## Objetivo

`clients`, `bookings`, `memberships`, `credit_movements`, `receipt_sequences`, `payments`, `coaching_programs` y `coaching_checkins` pertenecen a un business, con índices únicos por business.

## Contexto

Mismo patrón que 003. `clients(email)`, `receipt_sequences(year)` y `payments(receipt_number)` son únicos globales y deben pasar a ser por business. El backfill debe respetar la consistencia: cada registro hereda el business de su relación principal (que ya es el por defecto).

## Alcance

- Migración `1795266200_added_business_to_clients_and_operations.js` con el patrón de 003 (agregar → backfill → `required` → índice).
- Índices: `clients` único `(business, email)` donde `email != ''`; `receipt_sequences` único `(business, year)`; `payments` único `(business, receipt_number)` donde `receipt_number != ''`.
- Completar `TENANT_COLLECTIONS` con estas colecciones.
- Prueba de integración sobre una base con datos (migración + conteo de filas sin `business` = 0).

## Criterios de aceptación

- [ ] Todas las filas existentes quedan en el business por defecto; ninguna sin `business`.
- [ ] El mismo email de cliente y el mismo número de recibo pueden existir en dos business y se rechazan dentro de uno.
- [ ] `receipt_sequences` conserva los contadores actuales del business por defecto.
- [ ] `down` revierte índices y campos sin perder datos.
- [ ] `bun run build:ts` y `bun test` pasan en verde.

## Fuera de alcance

- Cambio de prefijo y secuencia en el código de recibos (012).

## Referencias

- `features/020-multi-tenancy-business/spec.md`, sección "Fase 1: Fundamentos de datos y aislamiento" → tarea 004.
- `api/pb_migrations/1795264400_created_clients.js`
- `api/pb_migrations/1795264800_created_receipt_sequences.js`

## Notas de implementación

<!-- Vacío al crear la tarea. Al completarla, registra archivos creados/modificados, decisiones, desviaciones y hallazgos pendientes. -->
