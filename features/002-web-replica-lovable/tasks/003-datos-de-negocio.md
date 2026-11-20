# 003 - [Web] Datos de negocio tipados

- **Prioridad:** 3
- **Estado:** Completado
- **Depende de:** Feature 001 (boilerplate web)
- **Fase:** Fase 1: Fundamentos

## Objetivo

Los planes de precios, las plantillas de clases y la función de disponibilidad viven en un módulo tipado y probado, que las páginas y el calendario consumen.

## Contexto

En el original son constantes en un módulo de datos. `web/src/lib/` solo tiene `env.ts`. La lógica es pura (sin acceso a entorno ni a `Date.now`). Convención de la feature: TypeScript estricto y alias `@/`.

## Alcance

- Crear `web/src/lib/data.ts` con:
  - `interface Plan { name: string; price: number; unit: string; sessions: string; freq: string; note?: string }` y `interface ClassTemplate { day: number; time: string; service: 'Group Strength' | 'Tropical Jump'; coach: string; capacity: number }` (`day`: 0 = domingo … 6 = sábado).
  - `personalOneOnOne` (unit `per 4 weeks`): `2x / week` $800, 8 sessions, 2 sessions per week; `3x / week` $1080, 12 sessions, 3 sessions per week; `4x / week` $1280, 16 sessions, 4 sessions per week.
  - `personalPartner` (unit `per 4 weeks`): `Partner 2x / week` $1127 (8 sessions, 2 sessions per week); `Partner 3x / week` $1447 (12, 3); `Partner 4x / week` $1597 (16, 4).
  - `groupPlans`: `8-Class Pack` $260, `per 4 weeks`, `8 classes`, `2 classes per week`; `16-Week Commitment` $200, `per 4-week period`, `8 classes / period`, `4 billing periods`, note `Requires a 16-week commitment (4 billing periods).`
  - `jumpPlans`: `Single Class` $15, `per class`, `1 class`, `Drop in anytime`; `First Class` $0, `first visit`, `1 class`, `New clients only`, note `One per client account.`
  - `classTemplates` (coach `Coach JQ`): lunes 7:30 PM Tropical Jump (12); martes 9:00 AM, 5:30 PM y 7:00 PM Group Strength (6); miércoles 7:30 PM Tropical Jump (12); jueves 9:00 AM, 5:30 PM y 7:00 PM Group Strength (6); sábado 9:00 AM Tropical Jump (12).
  - `availability(spotsLeft: number): 'full' | 'almost' | 'available'`: `<= 0` → `full`, `<= 2` → `almost`, otro → `available`.
  - `formatPrice(price: number): string`: `0` → `FREE`, otro → `$` + número con separador de miles en `en-US` (`1080` → `$1,080`).
- Pruebas en `web/src/lib/data.test.ts`: límites de `availability` (-1, 0, 1, 2, 3), `formatPrice` (0, 15, 1080), cantidad de elementos de cada lista, que ningún `ClassTemplate` tenga `capacity` ≤ 0 y que `day` esté entre 0 y 6.
- Límites: sin componentes ni páginas.

## Criterios de aceptación

- [x] `data.ts` exporta las 4 listas de planes, `classTemplates`, `availability` y `formatPrice` con los valores indicados.
- [x] `formatPrice(1080)` devuelve `$1,080` y `formatPrice(0)` devuelve `FREE`.
- [x] `availability(0)` es `full`, `availability(2)` es `almost` y `availability(3)` es `available`.
- [x] `bun run lint`, `bun run format:check`, `bun run check`, `bun run test` y `bun run build` pasan en verde.

## Referencias

- `features/002-web-replica-lovable/spec.md`, "Contrato de datos" → tarea 003.
- `features/002-web-replica-lovable/reference/html/pricing.html` y `schedule.html` (valores renderizados).

## Fuera de alcance

- Cálculo de cupos y de la semana visible (tarea 018).

## Notas de implementación

<!-- Vacío al crear la tarea. -->
