# 007 - [Pruebas] Pruebas de interfaz y documentación del dashboard y la auditoría

- **Prioridad:** 7
- **Estado:** Completado
- **Depende de:** 001, 002, 003, 004, 005, 006
- **Fase:** Fase 4: Pruebas y cierre del MVP

## Objetivo

El dashboard y la auditoría tienen pruebas de interfaz y documentación operativa.

## Contexto

La lógica pura del servidor está cubierta en 001 y la de auditoría en 005; falta cubrir composables, tarjetas y vistas y documentar el endpoint y la restricción por rol.

## Alcance

- Pruebas Vitest: `useDashboard` (carga, error, limpieza del temporizador), `TodayClassesCard` («Sin coach», disponibilidad), `UpcomingPaymentsCard` (placeholder y con datos), `DashboardView` (renderiza métricas con respuesta simulada), `AuditView` (filtros, paginación, detalle del diff), guard de `/audit` por rol, nav filtrada por rol.
- `api/README.md`: contrato de `/api/admin/dashboard`, manejo de zona horaria y cómo 014 rellena `upcoming_payments`.
- `app/README.md`: tarjetas del dashboard, cómo añadir una nueva y la vista de auditoría.

## Criterios de aceptación

- [x] Las pruebas nuevas pasan y cubren casos negativos (error de red, rol no permitido).
- [x] Los READMEs documentan endpoint, zona horaria, placeholder y auditoría.
- [x] `bun test` (api) y `bun run test` (app) pasan.

## Referencias

- `features/012-dashboard-operativo/spec.md`, sección "Fase 4" → tarea 007.

## Fuera de alcance

- Checklist y script global del MVP (008).

## Notas de implementación


- Pasaron 54 pruebas de API y 196 de la app. Vitest cubre carga, reintento, temporizador, tarjetas, filtros, paginación, diff y rutas por rol. Los dos READMEs documentan los flujos y contratos.
