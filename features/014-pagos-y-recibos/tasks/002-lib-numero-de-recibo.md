# 002 - [Lib] Número de recibo `JQ-AAAA-NNNNNN`

- **Prioridad:** 2
- **Estado:** Completado
- **Depende de:** Ninguna
- **Fase:** Fase 2: Lógica pura

## Objetivo

El formato, la validación y el cálculo del siguiente número de recibo están en una lib pura con pruebas.

## Contexto

El año del recibo es el año local del negocio (`America/New_York`) de `paid_at`; `paid_at` es una fecha local `YYYY-MM-DD`, por lo que basta leer sus primeros cuatro dígitos sin `Intl`. La lib se compila a `pb_hooks/lib/` y la usa `payments-service.ts` (004) dentro de una transacción.

## Alcance

- Crear `api/src/lib/receipt-number.ts`: `formatReceipt(year, seq)` (con relleno a 6 dígitos y validación de rango 1..999999), `parseReceipt(text)` → `{ year, seq } | null`, `isValidReceipt(text)`, `nextSequence(lastSeq)` (error si excede 999999), `localYear(paidAt)`.
- Pruebas `receipt-number.test.ts`: relleno, año distinto, entradas inválidas (`JQ-2026-12`, minúsculas, año de 2 dígitos), ida y vuelta formato/parseo, desbordamiento, cambio de año (31 dic / 1 ene).
- Sin acceso a `$app`.

## Criterios de aceptación

- [x] `formatReceipt(2026, 42)` devuelve `JQ-2026-000042`.
- [x] `parseReceipt("JQ-2026-000042")` devuelve `{ year: 2026, seq: 42 }`; entradas malformadas devuelven `null`.
- [x] `nextSequence(999999)` lanza error.
- [x] `bun test` y `bun run build:ts` pasan.

## Referencias

- `features/014-pagos-y-recibos/spec.md`, "Reglas de dominio" → Número de recibo.

## Fuera de alcance

- Lectura/escritura del contador (004).

## Notas de implementación

<!-- Vacío al crear la tarea. -->
