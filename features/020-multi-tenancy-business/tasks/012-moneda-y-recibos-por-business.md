# 012 - [Módulo] Moneda y recibos por business

- **Prioridad:** 12
- **Estado:** Pendiente
- **Depende de:** 007, 010, 011
- **Fase:** Fase 2: Zona horaria, moneda y mensajes por business

## Objetivo

Los recibos usan el prefijo y la secuencia del business, y los importes se exponen con la moneda del business.

## Contexto

`api/src/lib/receipt-number.ts` formatea y parsea `JQ-AAAA-NNNNNN` con prefijo fijo; `receipt_sequences` y `payments(receipt_number)` ya son por business (004). Los reportes financieros asumen USD.

## Alcance

- `receipt-number.ts`: `formatReceipt(prefix, year, seq)`, `parseReceipt(text, prefix)`, `isValidReceipt`; los recibos ya emitidos conservan su texto y siguen siendo válidos para el prefijo del business por defecto (`JQ`).
- `payments-store.ts`/`payments-service.ts`: la secuencia se toma por `(business, year)` dentro de la misma transacción atómica actual.
- Rutas de pagos y reportes: incluir `currency` del business en la respuesta; `reports-finance.ts` rechaza mezclar monedas (un business tiene una).
- Pruebas: `receipt-number.test.ts` con prefijos distintos y regresión de los existentes; secuencias independientes por business.

## Criterios de aceptación

- [ ] Dos business emiten el recibo n.º 1 de su año sin colisión y con su propio prefijo.
- [ ] Los recibos existentes siguen validando y no cambian.
- [ ] Las respuestas de pagos y reportes incluyen `currency`.
- [ ] `bun run build:ts` y `bun test` pasan en verde.

## Fuera de alcance

- Formateo de moneda en la app (016) y en `web/` (019).

## Referencias

- `features/020-multi-tenancy-business/spec.md`, sección "Fase 2: Zona horaria, moneda y mensajes por business" → tarea 012.
- `api/src/lib/receipt-number.ts`, `api/src/lib/payments-service.ts`

## Notas de implementación

<!-- Vacío al crear la tarea. Al completarla, registra archivos creados/modificados, decisiones, desviaciones y hallazgos pendientes. -->
