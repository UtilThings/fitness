# 004 - [Endpoint] Rutas para asignar, renovar, pausar, cancelar y ajustar membresías

- **Prioridad:** 4
- **Estado:** Completado
- **Depende de:** 001, 002, 003
- **Fase:** Fase 3: Servidor

## Objetivo

Reception y owner gestionan el ciclo de vida de una membresía mediante rutas transaccionales, con saldo coherente y auditoría.

## Contexto

`memberships` y `credit_movements` tienen escritura `null`, así que solo estas rutas escriben. Goja no comparte scope: cada handler hace `require(`${__hooks}/lib/...`)`. La lógica con base de datos va en `memberships-service.ts`, que recibe `app` por parámetro (sin globals) para reutilizarla desde 005, 006 y la feature 014/015. El middleware de roles y el helper de auditoría vienen de la feature 005 (`api/src/lib/audit-config.ts`).

## Alcance

- Crear `api/src/lib/memberships-service.ts`: `assign`, `renew`, `pause`, `resume`, `cancel`, `adjust`, `recordMovement(app, membership, delta, reason, ...)` (inserta el movimiento y actualiza `credits_balance` en la misma transacción, bajo `app.runInTransaction`).
- Crear `api/src/hooks/memberships.ts` con las rutas `POST /api/admin/memberships/assign`, `/:id/renew`, `/:id/pause`, `/:id/resume`, `/:id/cancel`, `/:id/adjust`, restringidas a `owner` y `reception`.
- Reglas: `assign` copia `commitment_periods_total` del plan, aplica reglas de primera clase y clase suelta, rechaza plan activo duplicado (`409`); `cancel` fija `ended_on` = hoy local; `renew` de una `expired` vacía `ended_on`; `renew` exige estado `active` o `expired` (no `cancelled`) y aplica la regla de inicio dentro/fuera de gracia; `pause`/`cancel` exigen `note`; `cancel` expira créditos y marca cancelación anticipada en `notes`; `adjust` exige `delta` entero ≠ 0 y `note`.
- Añadir `memberships` y `credit_movements` a `api/src/lib/audit-config.ts` y registrar cada acción como `custom` con resumen.
- Pruebas: la lógica pura ya está cubierta; añadir casos de contrato en `scripts/verify-api.sh` (asignar, ajustar, pausar/reanudar, error por rol y por estado).

## Criterios de aceptación

- [x] `assign` crea la membresía con periodo 1 y un movimiento `grant` igual a los créditos del plan.
- [x] `cancel` deja `status = cancelled` y `ended_on` con la fecha local de hoy; renovar una `expired` vacía `ended_on`.
- [x] `renew` suma 28 días al periodo y otorga créditos; sobre una `cancelled` devuelve `409`.
- [x] `adjust` sin nota devuelve `400`; con nota crea `adjust` y el saldo coincide con la suma de movimientos.
- [x] Un `coach` recibe `403` en todas las rutas.
- [x] Un fallo a mitad de operación no deja movimiento sin saldo (transacción).
- [x] Cada acción deja una fila en `audit_logs`.
- [x] `bun run build:ts`, `bun test` y `scripts/verify-api.sh` pasan.

## Referencias

- `features/013-membresias-y-creditos/spec.md`, sección "Contrato de rutas" y "Fase 3" → tarea 004.
- https://pocketbase.io/docs/js-routing/ y https://pocketbase.io/docs/js-database/#transaction

## Fuera de alcance

- Enganche con reservas (005) y cron (006); generación de cobros (014).

## Notas de implementación

<!-- Vacío al crear la tarea. -->
