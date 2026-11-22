# 006 - [Composable] Utilidades y composables del catálogo

- **Prioridad:** 6
- **Estado:** Completado
- **Depende de:** 005, Feature 006 (contrato)
- **Fase:** Fase 3: Interfaz

## Objetivo

La UI cuenta con utilidades de formato/validación y composables que encapsulan todo el acceso a `services` y `plans`.

## Contexto

`app/src/lib/pocketbase.ts` exporta `pb`; `app/src/composables/` tiene `useAuth` y `useMediaQuery` con pruebas Vitest junto al archivo. La feature 006 (contrato) deja la base de módulos (componentes de lista/formulario, utilidades de errores); antes de crear nada, revisar `app/src/components` y `app/src/composables` para reutilizar lo que exista (no duplicar). Textos en español; dinero en centavos USD.

## Alcance

- Crear `app/src/lib/catalog.ts` con tipos `Service` y `Plan` y funciones puras: `formatCents(cents)` (`$1,080`, `Gratis` si 0), `billingUnitLabel`, `kindLabel`, `policyLabel(hours)` («24 h antes»), `reorder(items, id, 'up'|'down')` → lista de `{id, sort}` a persistir (intercambia con el vecino y normaliza), y `validateServiceForm`/`validatePlanForm` espejo de las reglas del servidor.
- Crear `app/src/composables/useServices.ts` y `usePlans.ts`: estado reactivo (`items`, `loading`, `error`), `load`, `save`, `setActive`, `move`, `remove` usando `pb.collection('services'|'plans')` con orden `sort,name`; `usePlans` admite filtro por servicio y expande `service`. Los errores del SDK (`ClientResponseError.response.data`) se convierten a `{campo: mensaje}`.
- `useServices` expone `coachOptions` (admins con `active = true && role != "reception"`).
- Pruebas Vitest: `app/src/lib/catalog.test.ts` (formato de 0, 80000, 128000; `reorder` en extremos; validación) y pruebas de los composables con el SDK simulado (`vi.mock`).

## Criterios de aceptación

- [x] `formatCents(108000)` = `$1,080` y `formatCents(0)` = `Gratis`.
- [x] `reorder` no mueve el primer elemento hacia arriba ni el último hacia abajo.
- [x] Los composables devuelven errores por campo cuando el servidor responde 400.
- [x] `bun run test`, `typecheck`, `lint` y `format:check` pasan.

## Referencias

- `features/008-catalogo-de-servicios-y-planes/spec.md`, "Fase 3" → tarea 006.
- `app/src/composables/useAuth.ts` y su prueba (patrón de composable y mocks).
- https://github.com/pocketbase/js-sdk

## Fuera de alcance

- Componentes visuales y rutas (007, 008).

## Notas de implementación

Pasaron 113 pruebas de la app, typecheck, lint y formato. Los composables reutilizan useCollection y parsePbError. El orden persiste en una sola transacción mediante una ruta del catálogo restringida a owner; se verificó en PocketBase que rechaza cambios obsoletos y que un coach no puede modificar el orden.
