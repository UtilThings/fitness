# 004 - [Vista] DashboardView operativo y navegación

- **Prioridad:** 4
- **Estado:** Completado
- **Depende de:** 003
- **Fase:** Fase 2: Dashboard en la app

## Objetivo

La ruta `/` muestra el panel operativo con todas las tarjetas del spec.

## Contexto

`app/src/views/admin/DashboardView.vue` es hoy un marcador y la ruta `/` ya existe como hija de `AdminLayout` (`meta.title` «Dashboard»). `admin-nav.ts` tiene `Dashboard` en `Análisis`; los marcadores falsos los retiró la 006.

## Alcance

- Reescribir `DashboardView.vue`: fila de `StatCard` (clientes activos, clases hoy, reservas hoy, en espera), `TodayClassesCard`, `AttentionCard` y `UpcomingPaymentsCard`; botón de actualizar y marca «Actualizado hh:mm».
- Enlaces: clientes activos → `/clients?status=active`; clases y sesiones → `/classes` (o la sesión); sin romper rutas existentes.
- Verificar `admin-nav.ts`: la entrada `Dashboard` es real; retirar cualquier marcador residual sin tocar otras entradas.
- Diseño responsive (columna única en móvil).

## Criterios de aceptación

- [x] `/` muestra las cuatro métricas, las clases de hoy con ocupación, las alertas y el placeholder de cobros.
- [x] Los datos coinciden con `/classes` y con las reservas del día.
- [x] En móvil las tarjetas se apilan sin desbordar.
- [x] `typecheck`, `lint`, `format:check`, `test` y `build` pasan.

## Referencias

- `features/012-dashboard-operativo/spec.md`, sección "Fase 2" → tarea 004.
- `app/src/views/admin/DashboardView.vue`, `app/src/layouts/admin-nav.ts`.

## Fuera de alcance

- Pruebas y documentación (007); `/audit` (005, 006).

## Notas de implementación


- Chromium a 360 px confirmó que las métricas se apilan sin desbordar y que el enlace abre el detalle de la clase. Se cotejó la ocupación con las reservas de PocketBase. La entrada Dashboard ya apuntaba a /. Pasaron typecheck, lint, format:check, test y build.
