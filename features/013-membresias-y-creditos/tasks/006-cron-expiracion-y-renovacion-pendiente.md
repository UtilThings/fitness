# 006 - [Hook] Cron diario de expiración y renovación pendiente

- **Prioridad:** 6
- **Estado:** Completado
- **Depende de:** 002, 004
- **Fase:** Fase 3: Servidor

## Objetivo

Cada día, los créditos sobrantes expiran al terminar el periodo y las membresías sin renovar pasan a `expired` al agotarse la gracia.

## Contexto

PocketBase ofrece `cronAdd` para tareas programadas. "Hoy" debe ser la fecha local del negocio (`America/New_York`); verificar qué ofrece goja y usar el helper de hora local de 009 (o la utilidad de la feature 005) para obtenerla. La renovación es manual, por lo que el cron nunca crea periodos.

## Alcance

- Crear `api/src/hooks/memberships-cron.ts` con `cronAdd("memberships_daily", "0 9 * * *", ...)` (09:00 UTC, mañana local en ambas estaciones) que recorre membresías `active` con `current_period_end < hoy`:
  - si `credits_balance > 0` y no hay un `expire` del periodo, registrar `expire` por el saldo (vía `recordMovement`);
  - si `shouldExpire(m, hoy, GRACE_DAYS)`, cambiar `status = expired` y fijar `ended_on = hoy` (fecha local).
- Idempotente: ejecutar dos veces el mismo día no duplica movimientos.
- Ruta `POST /api/admin/memberships/run-daily` solo `owner` que ejecuta el mismo servicio (`runDaily(app, today)`) y devuelve conteos `{ expiredCredits, expiredMemberships }`.
- Registrar los cambios en `audit_logs` como `custom`.
- Verificación: caso en `scripts/verify-api.sh` con una membresía vencida.

## Criterios de aceptación

- [x] Membresía con periodo vencido y saldo 5 genera `expire -5` y saldo 0.
- [x] Día 7 de gracia sigue `active`; día 8 pasa a `expired` con `ended_on` = ese día.
- [x] Segunda ejecución no crea movimientos nuevos.
- [x] `run-daily` con rol distinto de `owner` devuelve `403`.
- [x] `bun run build:ts` y `scripts/verify-api.sh` pasan.

## Referencias

- `features/013-membresias-y-creditos/spec.md`, "Renovación pendiente" y "Fase 3" → tarea 006.
- https://pocketbase.io/docs/js-jobs-scheduling/

## Fuera de alcance

- Avisos al cliente (018); generación de cobros (014).

## Notas de implementación

El endpoint devuelve la suma de créditos expirados y el número de membresías vencidas. La prueba de integración cubre los días 7 y 8 en la misma ejecución, la auditoría y una segunda ejecución sin cambios.
