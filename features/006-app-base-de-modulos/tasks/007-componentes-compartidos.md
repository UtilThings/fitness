# 007 - [Componente] PageHeader, StatusTag, EmptyState, DataToolbar y useConfirmDelete

- **Prioridad:** 7
- **Estado:** Pendiente
- **Depende de:** 003, 006
- **Fase:** Fase 3

## Objetivo

Las vistas de módulo comparten cabecera, etiquetas de estado, estado vacío, barra de herramientas y confirmación de borrado.

## Contexto

`src/components/` solo tiene `AuthHeading.vue`. `DashboardView` define su propio título. PrimeVue 5 ofrece `Tag`, `InputText`, `IconField`, `Button` y `useConfirm` (tarea 003). Las pruebas de componentes necesitan `@vue/test-utils`; añadirlo como dependencia de desarrollo si falta.

## Alcance

- Crear `src/components/PageHeader.vue` (props `title`, `description?`; slot `actions`).
- Crear `StatusTag.vue` (props `value`, `map: Record<string, { label, severity }>`; un valor desconocido muestra el texto crudo con severidad `secondary`).
- Crear `EmptyState.vue` (props `icon`, `title`, `description?`; slot por defecto para la acción).
- Crear `DataToolbar.vue` (prop `placeholder`, `modelValue` del buscador con *debounce* de 300 ms; emite `search`; slots `filters` y `actions`).
- Crear `src/composables/useConfirmDelete.ts`: `confirmDelete({ message, header?, onConfirm })` sobre `useConfirm` con botones «Eliminar» (severidad danger) y «Cancelar».
- Pruebas Vitest de cada componente (render, slots, *debounce* con timers falsos, mapa de estados) y del composable con `useConfirm` mockeado.

## Criterios de aceptación

- [ ] Cada componente se renderiza con sus slots y props y tiene prueba.
- [ ] `DataToolbar` emite `search` una sola vez tras 300 ms de inactividad.
- [ ] `confirmDelete` no ejecuta `onConfirm` hasta aceptar el diálogo.
- [ ] `bun run typecheck`, `lint`, `format:check`, `test`, `build` pasan.

## Referencias

- `features/006-app-base-de-modulos/spec.md`, sección "Fase 3" → tarea 007.
- https://primevue.org/tag/
- https://primevue.org/confirmdialog/

## Fuera de alcance

- Vistas concretas de módulos (007 en adelante).
- Tabla genérica (cada módulo usa `DataTable` de PrimeVue con `useCollection`).

## Notas de implementación

