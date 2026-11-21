# 004 - [Composable] useClients y componentes base

- **Prioridad:** 4
- **Estado:** Pendiente
- **Depende de:** 002, 003, Feature 006 (contrato)
- **Fase:** Fase 2: Interfaz de clientes

## Objetivo

La app dispone del composable de datos de clientes y de los componentes reutilizables (formulario, etiqueta de estado y selector) que usarán las vistas de esta feature y la feature 011.

## Contexto

`app/` usa Vue 3, PrimeVue 5 y el SDK de PocketBase (`src/lib/pocketbase.ts` exporta `pb`). Hoy existen `composables/useAuth.ts` y `useMediaQuery.ts`. La feature 006 aporta la base de módulos (patrón de composables y componentes de tabla/diálogo); sigue ese patrón si existe. Textos en español.

## Alcance

- Crear `app/src/lib/clients.ts`: tipos `Client`, `ClientStatus`, `fullName`, `formatPhone` (E.164 → `(305) 555-0100`), `buildSearchFilter(q)` que devuelve el filtro de PocketBase con cada token contra `first_name`, `last_name`, `email` y `phone` (AND entre tokens, OR entre campos) y `pb.filter` para parámetros.
- Crear `app/src/composables/useClients.ts`: `list({ q, status, page, perPage })` con ordenación por apellido, `get(id)`, `create`, `update`, `setStatus`, `remove`; errores de validación del servidor mapeados a campos.
- Componentes en `app/src/components/clients/`: `ClientStatusTag.vue` (colores por estado, etiquetas «Activo», «Pausado», «Inactivo»), `ClientForm.vue` (datos básicos; muestra errores por campo y avisa si el teléfono ya existe), `ClientPicker.vue` (`AutoComplete` con búsqueda remota; emite el cliente elegido; reutilizable en 011).
- Pruebas Vitest de `lib/clients.ts` (filtro, formato) y del composable con `pb` simulado.

## Criterios de aceptación

- [ ] `buildSearchFilter('ana 305')` genera un filtro con dos tokens, cada uno contra los cuatro campos.
- [ ] `ClientForm` muestra los errores `400` del servidor junto a cada campo.
- [ ] `ClientPicker` emite un cliente seleccionado y no consulta con menos de 2 caracteres.
- [ ] `bun run typecheck`, `lint`, `format:check` y `test` pasan.

## Referencias

- `features/010-clientes/spec.md`, sección "Fase 2" → tarea 004.
- `app/src/lib/pocketbase.ts`, `app/src/composables/useAuth.ts`.
- https://primevue.org/autocomplete/

## Fuera de alcance

- Vistas y rutas (005, 006); formulario de evaluación (006).

## Notas de implementación

