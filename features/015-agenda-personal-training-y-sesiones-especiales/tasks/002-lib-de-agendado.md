# 002 - [Lib] Reglas de agendado: solapes, disponibilidad y capacidad privada

- **Prioridad:** 2
- **Estado:** Pendiente
- **Depende de:** Ninguna
- **Fase:** Fase 2: Lógica pura

## Objetivo

Las reglas de choques de horario, contención en disponibilidad y capacidad de sesiones privadas son funciones puras con pruebas.

## Contexto

Las sesiones se guardan en UTC (`starts_at`) y la disponibilidad en hora local; goja no tiene `Intl` fiable, por lo que la lib recibe datos ya convertidos (`weekday`, minutos locales) con el helper de conversión de 009 en el llamador. Planes: `partner` (008).

## Alcance

- Crear `api/src/lib/scheduling.ts`: `toMinutes("HH:mm")`, `intervalsOverlap(a, b)` (bordes tocándose no solapan), `isWithinAvailability(slots, weekday, startMin, endMin)`, `validateAvailabilitySlots(slots)` (formato, orden, sin solapes por día), `findCoachConflicts(sessions, coachId, startMs, durationMin, excludeId)` (ignora `cancelled`), `findBlockConflicts(blocks, localDate)`, `privateCapacity({ clientCount, partnerCount })`, `validatePrivateSession(input)` y `validateSpecialSession(input)` con códigos `coach_conflict`, `outside_availability`, `invalid_capacity`, `partner_required`, `title_required`, `block_conflict`.
- Pruebas `api/src/lib/scheduling.test.ts`: solape parcial/total/borde, tramo que no contiene la sesión, sesión que cruza dos tramos (rechazada), edición excluyendo la propia sesión, capacidad 1 y 2 con y sin partner, especial sin título, medianoche.

## Criterios de aceptación

- [ ] Una sesión 10:00-11:00 y otra 11:00-12:00 del mismo coach no chocan; 10:30-11:30 sí.
- [ ] Una sesión 08:30-09:30 dentro del tramo 08:00-12:00 es válida; 11:30-12:30 no.
- [ ] Dos clientes sin ambos partner devuelven `partner_required`.
- [ ] `bun test` y `bun run build:ts` pasan.

## Referencias

- `features/015-agenda-personal-training-y-sesiones-especiales/spec.md`, "Reglas de dominio".

## Fuera de alcance

- Lectura de datos y hooks (003, 004).

## Notas de implementación

<!-- Vacío al crear la tarea. -->
