# 002 - [Lib] Semana del programa, adherencia y alertas

- **Prioridad:** 2
- **Estado:** Completado
- **Depende de:** Ninguna
- **Fase:** Fase 2: Lógica pura

## Objetivo

Los cálculos de progreso del programa, adherencia, check-in pendiente y alertas de renovación son funciones puras y probadas, reutilizables en servidor y en la app.

## Contexto

Fechas locales `YYYY-MM-DD`; `today` por parámetro; sin `Intl`. `api/src/lib/membership-cycles.ts` (013) aporta `addDays`/`diffDays`. La app puede reutilizar la lógica mediante un archivo propio equivalente o importándola si 005 definió un paquete compartido (verificar; no duplicar divergentemente).

## Alcance

- Crear `api/src/lib/coaching.ts` con: `endsOn(startsOn, durationWeeks)`, `programWeek(program, today)` → `{ week, total }`, `adherenceSummary(checkins)` → `{ average, lastFour, trend, atRisk }`, `needsCheckin(program, lastCheckinDate, today, cadence = CHECKIN_CADENCE_DAYS)`, `renewalAlert(program, membership, today, windowDays = 7)` → `renewal_soon | renewal_overdue | membership_expired | null`, `programFlags(...)`, `validateCheckin(input, program, today)` y `validateProgramInput(input)` (duración 8/12/16, fechas, estados).
- Pruebas `api/src/lib/coaching.test.ts`: semana 1 y última, programa finalizado, sin check-ins, tendencia al alza/baja/plana con menos de 8 datos, `atRisk` con último ≤ 2, check-in futuro, programa `ended`, ventana de renovación en el borde.

## Criterios de aceptación

- [x] `endsOn("2026-01-05", 12)` devuelve `2026-03-30`.
- [x] `adherenceSummary` promedia los últimos 4 y marca `atRisk` si el último es ≤ 2.
- [x] `needsCheckin` es verdadero el día 8 sin check-in y falso el día 7.
- [x] `bun test` y `bun run build:ts` pasan.

## Referencias

- `features/016-online-coaching/spec.md`, "Reglas de dominio".

## Fuera de alcance

- Hooks y persistencia (003).

## Notas de implementación

El frontend comparte esta implementación por importación directa. La tendencia compara con hasta cuatro registros anteriores cuando existe una muestra previa; la cadencia se aplica a programas activos.
