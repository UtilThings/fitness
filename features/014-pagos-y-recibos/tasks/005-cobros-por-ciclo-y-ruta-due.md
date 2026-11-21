# 005 - [Hook] Cobros pendientes por ciclo y ruta `GET /api/admin/payments/due`

- **Prioridad:** 5
- **Estado:** Pendiente
- **Depende de:** 001, 003, 004
- **Fase:** Fase 3: Servidor

## Objetivo

Cada periodo de membresía genera su cobro pendiente automáticamente, y el staff puede consultar vencidos, por vencer y renovaciones en una sola ruta.

## Contexto

013 crea y renueva membresías con rutas transaccionales que incrementan `periods_paid` y mueven `current_period_*`. El hook debe reaccionar a esos cambios sin que 013 conozca los pagos. El índice único `(membership, period_index)` de 001 es la red de seguridad contra duplicados. "Hoy" local: helper de hora local de 009/005.

## Alcance

- Crear `api/src/hooks/payments-charges.ts`:
  - `onRecordAfterCreateSuccess` y `onRecordAfterUpdateSuccess("memberships")`: llamar `chargeForPeriod` y crear el `pending` si no existe (`ensurePendingCharge` en `payments-service.ts`); capturar el conflicto del índice único como no-op.
  - `GET /api/admin/payments/due` (roles `owner`/`reception`), con `days` (1-60) y `limit`, que arma el reporte con `buildDueReport` incluyendo nombre del cliente y del plan.
- Backfill opcional: función `backfillCharges(app)` invocable por el owner (`POST /api/admin/payments/backfill`) para membresías existentes sin cobro.
- Casos en `scripts/verify-api.sh`: asignar/renovar (013) crea cobro; repetir no duplica; `due` clasifica; coach `403`.

## Criterios de aceptación

- [ ] Asignar un plan de precio > 0 crea un `payments pending` con `due_on = current_period_start` y `period_index = 1`.
- [ ] Renovar crea el cobro del periodo 2; actualizar otros campos de la membresía no crea cobros.
- [ ] Plan de primera clase (precio 0) no crea cobro.
- [ ] `due` devuelve las secciones `overdue`, `upcoming`, `renewals` y `totals` según el contrato.
- [ ] `bun run build:ts` y `scripts/verify-api.sh` pasan.

## Referencias

- `features/014-pagos-y-recibos/spec.md`, "Reglas de dominio" y "Contrato de rutas".
- `api/src/lib/payments-due.ts` (003), `api/src/lib/payments-service.ts` (004).

## Fuera de alcance

- Avisos por correo (018); reportes (017).

## Notas de implementación

<!-- Vacío al crear la tarea. -->
