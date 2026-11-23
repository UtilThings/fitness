# 003 - [Lib] Créditos, reglas por plan y elegibilidad de reserva

- **Prioridad:** 3
- **Estado:** Completado
- **Depende de:** 002
- **Fase:** Fase 2: Lógica pura

## Objetivo

La lógica de saldo, créditos por tipo de plan y validación de reserva está en una lib pura con pruebas, lista para usarse desde hooks y desde la feature 015.

## Contexto

Forma de `plans` (contrato 008): `billing_unit` (`per_4_weeks`, `per_class`, `first_visit`), `sessions`, `per_week`, `commitment_periods`, `is_first_class`, `partner`. Estados de `bookings` (011): `booked`, `waitlisted`, `cancelled`, `late_cancelled`, `attended`, `no_show`. Los motivos permitidos de `credit_movements` son `grant`, `attend`, `late_cancel`, `adjust`, `expire` (decisión del spec: `no_show` → `late_cancel`).

## Alcance

- Crear `api/src/lib/credits.ts` con:
  - `creditsToGrant(plan)` → entero o `null` (ilimitado).
  - `reasonFor(status)` y `chargedAmount(status)` (−1 para `attended`, `late_cancelled`, `no_show`; 0 en el resto).
  - `creditsToApply(status, alreadyApplied)` → `{ delta, reason } | null` (idempotente; reversión como `adjust` +1).
  - `computeBalance(movements)`.
  - `requiresCredit(session, service)` (`regular` y `private` de servicios `group`/`personal`; `special` y `online` no).
  - `checkBookingEligibility({ membership, plan, committedBookings, weekBookings, override })` → `{ allowed, code, available }` con códigos `ok`, `no_membership`, `membership_not_active`, `no_credits`, `weekly_limit`, `overridden`.
  - `availableCredits(membership, committedBookings)` y `localWeekKey(date)` (lunes a domingo).
  - `canUseFirstClass(client, memberships)`.
- Pruebas `api/src/lib/credits.test.ts`: cada tipo de plan (12 sesiones, ilimitado con `per_week`, clase suelta, primera clase usada/no usada), idempotencia, reversión, saldo negativo con override, semana que cruza de mes.
- Sin `$app`; todo por parámetros.

## Criterios de aceptación

- [x] `creditsToApply("attended", 0)` da `-1/attend`; con `alreadyApplied = -1` da `null`; `creditsToApply("cancelled", -1)` da `+1/adjust`.
- [x] Plan ilimitado sin `per_week` siempre permite; con `per_week = 3` rechaza la cuarta reserva de la semana con `weekly_limit`.
- [x] Saldo 0 sin override da `no_credits`; con override da `allowed` y `overridden`.
- [x] Primera clase se rechaza si `free_class_used` es `true`.
- [x] `bun test` y `bun run build:ts` pasan.

## Referencias

- `features/013-membresias-y-creditos/spec.md`, sección "Reglas de dominio".
- `api/src/lib/membership-cycles.ts` (tarea 002).

## Fuera de alcance

- Lectura/escritura en base de datos (004, 005).

## Notas de implementación

<!-- Vacío al crear la tarea. -->
