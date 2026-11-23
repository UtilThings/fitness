# 002 - [Lib] Ciclos de 4 semanas y compromiso de 16 semanas

- **Prioridad:** 2
- **Estado:** Completado
- **Depende de:** Ninguna
- **Fase:** Fase 2: Lógica pura

## Objetivo

Una librería pura y probada calcula periodos de 28 días, fin de compromiso, renovación pendiente y expiración sin depender de `Intl` ni de PocketBase.

## Contexto

Las fechas de membresía son cadenas locales `YYYY-MM-DD` (zona `America/New_York`); goja no tiene `Intl` fiable, por lo que la lib usa aritmética de días UTC (`Date.UTC`). Las libs de `api/src/lib/*.ts` compilan a CJS en `pb_hooks/lib/` y se cargan con `require(`${__hooks}/lib/<x>`)` dentro de cada callback. La feature 005 aporta el script `bun test`.

## Alcance

- Crear `api/src/lib/membership-cycles.ts` con: `addDays(date, n)`, `diffDays(a, b)`, `periodBounds(startsOn, index)` (inicio y fin inclusive de 28 días, `index` desde 1), `nextPeriod(currentEnd)`, `commitmentEnd(startsOn, totalPeriods)` (`null` si 0), `commitmentState(m, today)` → `none | in_commitment | completed`, `isEarlyCancellation(m, today)`, `isRenewalPending(m, today)`, `shouldExpire(m, today, graceDays = 7)`, `extendByPause(periodEnd, pausedAt, today)` y constante `GRACE_DAYS`.
- Pruebas `api/src/lib/membership-cycles.test.ts`: cambio de año, febrero bisiesto, cambio de horario de verano (las fechas no deben desplazarse), periodo 1 y 4, compromiso 0 y 4, pausa de 0 y 10 días, gracia exacta (día 7 no expira, día 8 sí).
- Sin acceso a `$app`, entorno ni reloj: `today` siempre se recibe por parámetro.

## Criterios de aceptación

- [x] `periodBounds("2026-01-05", 1)` devuelve fin `2026-02-01` y el periodo 2 empieza `2026-02-02`.
- [x] `commitmentEnd("2026-01-05", 4)` devuelve `2026-04-26`.
- [x] Las pruebas cubren los casos de borde listados y `bun test` pasa.
- [x] `bun run build:ts` genera `pb_hooks/lib/membership-cycles` sin errores.

## Referencias

- `features/013-membresias-y-creditos/spec.md`, sección "Reglas de dominio" → Ciclos y Compromiso.
- https://bun.sh/docs/cli/test

## Fuera de alcance

- Créditos y elegibilidad (003); persistencia (004).

## Notas de implementación

<!-- Vacío al crear la tarea. -->
