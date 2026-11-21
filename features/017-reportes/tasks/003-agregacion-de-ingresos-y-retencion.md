# 003 - [Lib] Agregación de ingresos y retención

- **Prioridad:** 3
- **Estado:** Pendiente
- **Depende de:** 001, Feature 013 (contrato), Feature 014 (contrato)
- **Fase:** Fase 1: Lógica pura de agregación

## Objetivo

Existen funciones puras y probadas que calculan ingresos por plan, servicio y periodo, y la retención y bajas de membresías.

## Contexto

`payments` (014) guarda `amount_cents`, `status` (`pending|paid|void`), `paid_at`, `plan` y `membership`. `memberships` (013) guarda `status`, `starts_on`, `current_period_end`, `plan` y `ended_on` (fecha local de baja, fijada por 013 al cancelar o expirar). Todo en centavos USD. La lógica recibe objetos planos y eventos ya cargados.

## Alcance

- Crear `api/src/lib/reports-finance.ts` con `aggregateRevenue(payments, plans, services, { service?, groupBy, range })` y `aggregateRetention(memberships, plans, { groupBy, range })`.
- Ingresos: solo `paid` suma a `paid_cents` (por `paid_at` local); `pending_cents` y `void_cents` se informan aparte; `by_plan`, `by_service` (vía plan) y `by_period` con periodos vacíos rellenados con 0; pagos sin plan en el grupo `Sin plan`. Aritmética entera, nunca flotantes para dinero.
- Retención: `active_start` (activas al inicio del rango), `new` (`starts_on` en rango), `churned` (bajas en rango), `active_end`, `churn_rate`, `retention_rate`, `by_plan`, `by_period`; una membresía que se da de alta y de baja en el rango cuenta en ambos.
- Pruebas `reports-finance.test.ts`: pago en el límite de medianoche local, `void` y `pending` excluidos de ingresos, plan eliminado o ausente, filtro por servicio, baja por `ended_on` (cancelada y expirada), membresía reactivada sin `ended_on`, `active_start = 0`, suma de grupos = total, importes grandes sin pérdida de precisión.
- Sin consultas ni rutas.

## Criterios de aceptación

- [ ] Tres pagos `paid` de 8000, 10800 y 8000 centavos suman 26800 y se reparten correctamente por plan y por mes.
- [ ] Un pago `void` no aparece en `paid_cents` pero sí en `void_cents`.
- [ ] Con `active_start = 0`, `churn_rate = 0` y `retention_rate = 1`.
- [ ] La suma de `by_plan`, `by_service` y `by_period` iguala `totals.paid_cents`.
- [ ] `bun test` en `api/` pasa en verde.

## Referencias

- `features/017-reportes/spec.md`, sección "Fase 1" → tarea 003, y sección "Contrato HTTP".
- `api/src/lib/reports-range.ts` (tarea 001).

## Fuera de alcance

- Permisos de la ruta de ingresos (004).
- Previsión de ingresos, cohortes y renovaciones futuras.

## Notas de implementación

