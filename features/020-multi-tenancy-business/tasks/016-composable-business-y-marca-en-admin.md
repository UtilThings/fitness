# 016 - [Web] Composable `useBusiness` y marca dinámica del admin

- **Prioridad:** 16
- **Estado:** Pendiente
- **Depende de:** 006, 007
- **Fase:** Fase 4: Admin multi-tenant

## Objetivo

El sidebar, el título del documento y el logo del admin muestran los del business del usuario autenticado.

## Contexto

`app/src/layouts/AdminLayout.vue` incrusta `jq-logo.png` y «JQ Fitness»; `AuthLayout.vue` usa el mismo logo; `app/src/lib/business.ts` y `VITE_BUSINESS_CONTACT` definen nombre, ciudad y contacto; `useAuth.ts` gestiona la sesión. El login no conoce el business todavía.

## Alcance

- `app/src/composables/useBusiness.ts`: carga y expone `business` (nombre, logo, ciudad, contacto, moneda, zona) con `expand=business` o consulta de `businesses`; `logoUrl` con `pb.files.getURL`; se limpia al cerrar sesión.
- `AdminLayout.vue`: nombre y logo desde `useBusiness`, con esqueleto mientras carga y respaldo si no hay logo (iniciales); `document.title = "<Vista> · <Business>"`.
- `AuthLayout.vue`: marca neutral con `VITE_APP_NAME` (por defecto «Admin»), sin logo de un business.
- Formateadores `formatMoney` y `formatDateTime` basados en moneda y zona del business en `app/src/lib/`; sustituir los usos existentes de formato fijo en USD y `America/New_York`.
- Eliminar `app/src/lib/business.ts`, `VITE_BUSINESS_CONTACT` (`env.ts`, `env.d.ts`, `.env.example`) y mover el logo actual a `app/public` solo como respaldo si se decide conservarlo (documentar).
- Pruebas: `useBusiness.test.ts`, `AdminLayout`, `AuthLayout` y los formateadores.

## Criterios de aceptación

- [ ] Dos usuarios de business distintos ven su propio nombre y logo en el sidebar.
- [ ] El título del documento incluye el nombre del business.
- [ ] La pantalla de login no muestra el nombre ni el logo de ningún business.
- [ ] Los importes se formatean con la moneda del business y las fechas con su zona.
- [ ] No queda `business.ts` ni `VITE_BUSINESS_CONTACT` en la app.
- [ ] `bun run lint`, `bun run test`, `bun run build` y `vue-tsc` pasan en verde.

## Fuera de alcance

- Pantallas de edición del business (017, 018).

## Referencias

- `features/020-multi-tenancy-business/spec.md`, sección "Fase 4: Admin multi-tenant" → tarea 016.
- `app/src/layouts/AdminLayout.vue`, `app/src/composables/useAuth.ts`

## Notas de implementación

<!-- Vacío al crear la tarea. Al completarla, registra archivos creados/modificados, decisiones, desviaciones y hallazgos pendientes. -->
