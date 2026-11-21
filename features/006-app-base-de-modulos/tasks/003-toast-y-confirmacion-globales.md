# 003 - [Config] Toast y ConfirmationService globales

- **Prioridad:** 3
- **Estado:** Completado
- **Depende de:** Ninguna
- **Fase:** Fase 2

## Objetivo

Cualquier vista puede mostrar avisos y diálogos de confirmación sin montar componentes propios.

## Contexto

`main.ts` registra PrimeVue (con licencia opcional) y router; `App.vue` solo tiene `<RouterView />`. PrimeVue 5 requiere registrar `ToastService` y `ConfirmationService` para `useToast`/`useConfirm`. Verificar en `node_modules/primevue` los nombres de módulo vigentes antes de importar.

## Alcance

- Modificar `app/src/main.ts`: `.use(ToastService)` y `.use(ConfirmationService)`.
- Modificar `app/src/App.vue`: añadir `<Toast position="top-right" />` y `<ConfirmDialog />` junto a `<RouterView />`.
- Crear `app/src/composables/useNotify.ts` con `success(msg, title?)`, `error(msg, title?)`, `info(msg, title?)` sobre `useToast` (duraciones: 3 s éxito/info, 6 s error; títulos por defecto en español).
- Prueba `useNotify.test.ts` con `useToast` mockeado.

## Criterios de aceptación

- [x] Un `useNotify().success("Guardado")` muestra un toast verde en la esquina superior derecha.
- [x] `useConfirm().require(...)` muestra el diálogo sin errores en consola.
- [x] `bun run typecheck`, `test`, `lint`, `build` pasan.

## Referencias

- `features/006-app-base-de-modulos/spec.md`, sección "Fase 2" → tarea 003.
- https://primevue.org/toast/
- https://primevue.org/confirmdialog/

## Fuera de alcance

- Composable `useConfirmDelete` (tarea 007).

## Notas de implementación

