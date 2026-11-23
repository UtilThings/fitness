# 003 - [Componente] useDashboard y tarjetas del dashboard

- **Prioridad:** 3
- **Estado:** Completado
- **Depende de:** 002, Feature 011 (contrato)
- **Fase:** Fase 2: Dashboard en la app

## Objetivo

La app tiene el composable de datos del dashboard y las tarjetas reutilizables, incluido el placeholder de cobros por vencer.

## Contexto

`app/` usa Vue 3 y PrimeVue 5; `pb` en `src/lib/pocketbase.ts`; las horas se formatean con `src/lib/datetime.ts` (zona del negocio). 011 aporta `AvailabilityTag`. El dashboard actual es un marcador (`DashboardView.vue` con una `Card`).

## Alcance

- `app/src/composables/useDashboard.ts`: `data`, `loading`, `error`, `refresh()`; llama a `pb.send('/api/admin/dashboard')`; autorefresco cada 60 s solo con la pestaña visible (`document.visibilityState`) y limpieza al desmontar.
- Componentes en `app/src/components/dashboard/`:
  - `StatCard.vue` (título, valor, icono, enlace opcional).
  - `TodayClassesCard.vue`: lista de clases de hoy con hora local, servicio, coach (o «Sin coach»), `ProgressBar` de ocupación, `AvailabilityTag` y enlace a la sesión.
  - `AttentionCard.vue`: sesiones sin coach o sin reservas con su motivo.
  - `UpcomingPaymentsCard.vue`: si `upcoming_payments` es `null`, muestra «Disponible con Pagos (próximamente)»; si trae datos (014), lista conteo y total.
- Estados de carga (`Skeleton`) y error con reintento.

## Criterios de aceptación

- [x] `useDashboard` expone los datos del endpoint y refresca sin acumular temporizadores.
- [x] `TodayClassesCard` muestra «Sin coach» y el estado de disponibilidad correcto.
- [x] `UpcomingPaymentsCard` se ve como placeholder con `upcoming_payments = null`.
- [x] `typecheck`, `lint`, `format:check` y `test` pasan.

## Referencias

- `features/012-dashboard-operativo/spec.md`, sección "Fase 2" → tarea 003.
- https://primevue.org/progressbar/

## Fuera de alcance

- Composición de la vista (004); gráficas históricas (017).

## Notas de implementación


- Verificados el estado de carga y reintento, la única suscripción de 60 s con limpieza al desmontar, el uso de `AvailabilityTag` y la rama de cobros con valor nulo. Pasaron typecheck, lint, format:check y las 177 pruebas de la app.
