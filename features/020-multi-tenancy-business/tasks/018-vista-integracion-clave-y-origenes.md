# 018 - [Web] Vista «Integración»: clave pública y orígenes

- **Prioridad:** 18
- **Estado:** Pendiente
- **Depende de:** 014, 016
- **Fase:** Fase 4: Admin multi-tenant

## Objetivo

El owner genera o rota la clave pública de su business y gestiona los orígenes permitidos de su sitio desde el admin.

## Contexto

La ruta `POST /api/admin/business/public-key` (014) devuelve la clave una sola vez; `allowed_origins` es editable por el owner y validado por el servidor (002). La app mantiene los patrones de diálogo y confirmación en `useConfirmDelete`/`useNotify`.

## Alcance

- Ruta `/settings/integration` (solo owner) y entrada «Integración» en `admin-nav.ts`.
- `IntegrationView.vue`: muestra prefijo y fecha de rotación (nunca la clave); botón «Generar/Rotar clave» con confirmación que advierte que la clave anterior dejará de funcionar; diálogo que muestra la clave nueva una sola vez con botón «Copiar» y aviso de que no se podrá ver de nuevo.
- Editor de `allowed_origins` (lista, validación de formato en cliente alineada con el servidor, errores del servidor visibles).
- Composable `useBusinessKey.ts` con la llamada a la ruta; la clave solo vive en memoria del diálogo y se limpia al cerrarlo.
- Pruebas: vista, composable, guarda de rol y navegación.

## Criterios de aceptación

- [ ] Rotar muestra la clave una vez; al cerrar el diálogo no hay forma de recuperarla en la interfaz.
- [ ] Coach y reception no acceden.
- [ ] Un origen con `*`, sin protocolo o duplicado se rechaza con mensaje claro.
- [ ] La clave no se guarda en `localStorage`, estado global ni logs de consola.
- [ ] `bun run lint`, `bun run test`, `bun run build` y `vue-tsc` pasan en verde.

## Fuera de alcance

- Consumo de la clave por `web/` (019).

## Referencias

- `features/020-multi-tenancy-business/spec.md`, sección "Fase 4: Admin multi-tenant" → tarea 018.
- `app/src/layouts/admin-nav.ts`

## Notas de implementación

<!-- Vacío al crear la tarea. Al completarla, registra archivos creados/modificados, decisiones, desviaciones y hallazgos pendientes. -->
