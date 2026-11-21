# 002 - [Migración] Colección `plans`

- **Prioridad:** 2
- **Estado:** Pendiente
- **Depende de:** 001
- **Fase:** Fase 1: Esquema y datos

## Objetivo

PocketBase tiene la colección `plans` relacionada con `services`, con índices y reglas de API, y la migración es reversible.

## Contexto

`services` (tarea 001) ya existe. `plans` modela precios en centavos USD y las unidades de cobro del contrato. `memberships.plan` (013) y `payments.plan` (014) apuntarán aquí, por lo que la relación a `services` y las futuras relaciones entrantes no deben usar `cascadeDelete`.

## Alcance

- Crear `api/pb_migrations/<timestamp>_created_plans.js` (timestamp mayor que el de la tarea 001) con: `service` (relation → `services`, requerido, un valor, `cascadeDelete: false`), `name`, `price_cents` (número entero ≥ 0, requerido), `billing_unit` (select `per_4_weeks`|`per_class`|`first_visit`), `sessions` (entero ≥ 0), `per_week` (entero 0-7), `commitment_periods` (entero ≥ 0), `is_first_class` (bool), `partner` (bool), `note` (máx. 300), `active` (por defecto `true`), `sort`, autodates.
- Nota: PocketBase trata `0` como vacío en campos `required` de tipo number; `price_cents` no debe marcarse `required` (el hook de la tarea 005 exige que esté presente). Comprobarlo con un registro de precio 0 antes de cerrar la tarea.
- Índices: único sobre (`service`, `name`); sobre (`service`, `active`, `sort`).
- Reglas idénticas a `services` (lectura staff, escritura owner).
- `down`: elimina `plans`.

## Criterios de aceptación

- [ ] `plans` aparece en `/_/` con campos, índices y reglas; se puede crear un plan con `price_cents: 0`.
- [ ] Dos planes con el mismo `service` y `name` fallan por el índice único.
- [ ] Un `coach` solo puede leer; un `owner` puede escribir.
- [ ] `down` elimina `plans` sin tocar `services`; `up` vuelve a aplicarse.

## Referencias

- `features/008-catalogo-de-servicios-y-planes/spec.md`, sección "Modelo de datos" → `plans`.
- https://pocketbase.io/docs/js-migrations/
- https://pocketbase.io/docs/collections/#fields

## Fuera de alcance

- Seed (004), validaciones por hook como `is_first_class` única o plan activo con servicio activo (005).

## Notas de implementación

<!-- Vacío al crear la tarea. -->
