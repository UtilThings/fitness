# 004 - [Endpoint] Servicio y rutas para registrar, pagar y anular pagos

- **Prioridad:** 4
- **Estado:** Completado
- **Depende de:** 001, 002
- **Fase:** Fase 3: Servidor

## Objetivo

Reception y owner registran cobros, los marcan como pagados con recibo consecutivo y los anulan con motivo, todo en transacción y auditado.

## Contexto

`payments` tiene escritura `null`: solo estas rutas escriben. La asignación de número debe ocurrir en la misma transacción que el cambio a `paid`. `payments-service.ts` recibe `app` por parámetro (goja no comparte scope) y es el punto de extensión para una pasarela futura. Rol y auditoría vienen de 005 (`audit-config.ts`).

## Alcance

- Crear `api/src/lib/payments-service.ts` con `createPayment`, `settlePayment(app, id, { method, paidAt, recordedBy, note })`, `voidPayment(app, id, { reason, by })` e `issueReceipt(app, paidAtYear)` (lee/crea la fila de `receipt_sequences`, incrementa y devuelve el número, dentro de `app.runInTransaction`).
- Crear `api/src/hooks/payments.ts` con `POST /api/admin/payments`, `/:id/pay`, `/:id/void` (roles `owner` y `reception`). `POST /` con `status: paid` registra y numera en un solo paso; con `pending` exige `due_on`.
- Validar monto entero > 0, método permitido, `paid_at` no futuro (fecha local) y transiciones (`409` para paid→paid, void→cualquiera).
- Registrar `payments` en `audit-config.ts` y emitir auditoría `custom` para pago y anulación.
- Casos en `scripts/verify-api.sh`: registro pagado, pending→paid, anulación sin y con motivo, rol coach, número consecutivo.

## Criterios de aceptación

- [x] Registrar un pago `paid` devuelve `receipt_number` con el formato correcto; el siguiente es consecutivo.
- [x] Un error forzado después de incrementar el contador no deja el contador avanzado.
- [x] `/void` sin `reason` devuelve `400`; con motivo guarda `void_reason`, `voided_at`, `voided_by` y conserva `receipt_number`.
- [x] Pagar un `void` devuelve `409`.
- [x] Un coach recibe `403`.
- [x] `bun run build:ts`, `bun test` y `scripts/verify-api.sh` pasan.

## Referencias

- `features/014-pagos-y-recibos/spec.md`, "Contrato de rutas" y "Fase 3" → tarea 004.
- `api/src/lib/receipt-number.ts` (002).
- https://pocketbase.io/docs/js-database/#transaction

## Fuera de alcance

- Cobros por ciclo y `due` (005); UI (006-008); pasarela.

## Notas de implementación

La prueba de API fuerza un fallo de SQLite al guardar el pago y comprueba que el contador conserva su valor anterior. Dos cobros posteriores en paralelo reciben los dos números siguientes.
