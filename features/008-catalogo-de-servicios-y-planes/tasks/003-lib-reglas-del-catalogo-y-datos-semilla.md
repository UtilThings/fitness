# 003 - [Lib] Reglas del catálogo y datos semilla

- **Prioridad:** 3
- **Estado:** Completado
- **Depende de:** 001, 002
- **Fase:** Fase 1: Esquema y datos

## Objetivo

La lógica de validación del catálogo y los datos semilla viven en una librería pura, probada y con paridad verificada contra `web/src/lib/data.ts`.

## Contexto

`api/src/lib/` contiene `utils.ts` y se compila a CJS en `api/pb_hooks/lib/` con `bun run build:ts`; la feature 005 añade el script `test` (`bun test`). En goja los hooks cargan la lib con `require(`${__hooks}/lib/catalog`)`. Los datos reales están en `web/src/lib/data.ts` (`personalOneOnOne`, `personalPartner`, `groupPlans`, `jumpPlans`, `classTemplates`) y las políticas en `web/src/pages/{personal-training,group-strength-training,tropical-jump}.astro`. Online Coaching no tiene precio público (`web/src/pages/online-coaching.astro`).

## Alcance

- Crear `api/src/lib/catalog.ts` (sin dependencias de PocketBase ni de `web/`) con tipos `ServiceInput`, `PlanInput` y funciones puras:
  - `validateService(input)` → `Record<campo, mensaje>` (kind válido; `capacity` ≥ 1 para group/personal; `cancellation_hours` entero 0-168; `slug` con patrón).
  - `validatePlan(input)` → errores por campo (`price_cents` entero ≥ 0; si no `is_first_class` el precio debe ser > 0; si `is_first_class` exige `price_cents = 0` y `billing_unit = 'first_visit'`; `per_week` 0-7; `commitment_periods` ≥ 0).
  - `canActivatePlan(serviceActive)` y `findFirstClassConflict(plans, candidateId)` (devuelve el id en conflicto).
  - `dependentsBlockMessage(kind: 'service' | 'plan', counts)` → mensaje en español («Tiene 3 planes asociados; desactívalo en su lugar») o `null`.
  - Constante `CATALOG_SEED`: 5 servicios (`personal-1-a-1` cap. 1/24 h, `personal-partner` cap. 2/24 h, `group-strength` cap. 6/12 h, `tropical-jump` cap. 12/12 h, `online-coaching` cap. 0/0 h) y 10 planes con `price_cents`, `billing_unit`, `sessions`, `per_week`, `commitment_periods`, `is_first_class`, `partner`, `note` y `sort`.
- Crear `api/src/lib/catalog.test.ts` (`bun test`): casos válidos e inválidos de cada validador; unicidad de (service, name) en `CATALOG_SEED`; **paridad**: importa `../../web/src/lib/data` y comprueba que cada plan de `personalOneOnOne`, `personalPartner`, `groupPlans` y `jumpPlans` existe en el seed con `price_cents = price * 100`, mismas sesiones (`8 sessions` → 8) y frecuencia, y que las capacidades de `classTemplates` (6 y 12) coinciden con los servicios grupales.
- Nombres de plan: conservar los de `web` (`2x / week`, `Partner 2x / week`, `8-Class Pack`, `16-Week Commitment`, `Single Class`, `First Class`).
- Límites: sin acceso a la base ni a entorno.

## Criterios de aceptación

- [x] `bun test` en `api/` ejecuta las pruebas nuevas en verde.
- [x] La prueba de paridad falla si se cambia un precio en `CATALOG_SEED` o en `data.ts`.
- [x] `validatePlan` rechaza `price_cents = -1`, un plan pagado con precio 0 y un `is_first_class` con precio > 0.
- [x] `bun run build:ts` genera `api/pb_hooks/lib/catalog.js` sin errores.

## Referencias

- `features/008-catalogo-de-servicios-y-planes/spec.md`, secciones "Reglas de negocio" y "Estado actual" (tabla de datos).
- `web/src/lib/data.ts`, `web/src/pages/online-coaching.astro`.
- https://bun.sh/docs/cli/test

## Fuera de alcance

- Persistencia del seed (004) y registro de hooks (005).

## Notas de implementación

Bun ejecutó 30 pruebas y generó pb_hooks/lib/catalog.js. Se verificó la prueba de paridad cambiando temporalmente un precio en cada fuente y observando el fallo antes de restaurar los valores.
