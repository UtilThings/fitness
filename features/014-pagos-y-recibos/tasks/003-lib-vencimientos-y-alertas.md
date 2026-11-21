# 003 - [Lib] Vencimientos, cobro por periodo y alertas de renovación

- **Prioridad:** 3
- **Estado:** Pendiente
- **Depende de:** Ninguna
- **Fase:** Fase 2: Lógica pura

## Objetivo

La clasificación de cobros vencidos/por vencer, la regla de cobro por periodo y las alertas de renovación son funciones puras y probadas.

## Contexto

Fechas locales `YYYY-MM-DD`; `today` se recibe por parámetro. La lib `membership-cycles.ts` de 013 aporta `addDays`/`diffDays`/`isRenewalPending`. Forma de `plans`: `price_cents`, `billing_unit`, `is_first_class`.

## Alcance

- Crear `api/src/lib/payments-due.ts`:
  - `classifyDue(dueOn, today, windowDays)` → `overdue | due_soon | future | none`.
  - `chargeForPeriod(plan, membership)` → `{ amount_cents, due_on, period_index } | null` (`null` si precio 0, primera clase o membresía cancelada; `per_class` solo periodo 1).
  - `buildDueReport(payments, memberships, today, days)` con la forma de `GET /due` (vencidos ordenados por antigüedad, por vencer por fecha, renovaciones `ending_soon`/`lapsed`, `has_pending_payment`, totales).
- Pruebas `payments-due.test.ts`: borde exacto (hoy = vencimiento no es vencido; ayer sí), ventana de 7 días, totales, pagos `paid`/`void` ignorados, membresía pausada/cancelada sin alerta, `lapsed`, plan gratis.
- Sin `$app`.

## Criterios de aceptación

- [ ] `classifyDue("2026-11-21", "2026-11-21", 7)` es `due_soon`; con `today = 2026-11-22` es `overdue`.
- [ ] `chargeForPeriod` devuelve `null` para la primera clase gratuita.
- [ ] El reporte excluye pagos no `pending` y calcula totales en centavos.
- [ ] `bun test` y `bun run build:ts` pasan.

## Referencias

- `features/014-pagos-y-recibos/spec.md`, "Reglas de dominio" y "Contrato de rutas".
- `api/src/lib/membership-cycles.ts` (feature 013).

## Fuera de alcance

- Persistencia y hooks (004, 005); presentación (006-008).

## Notas de implementación

<!-- Vacío al crear la tarea. -->
