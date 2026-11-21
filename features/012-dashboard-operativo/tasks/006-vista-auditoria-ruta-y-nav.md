# 006 - [Vista] Vista de auditoría /audit solo para owner

- **Prioridad:** 6
- **Estado:** Pendiente
- **Depende de:** 005
- **Fase:** Fase 3: Auditoría

## Objetivo

El owner revisa en `/audit` los cambios registrados, con filtros y detalle del diff; los demás roles no ven ni acceden.

## Contexto

Las rutas protegidas son hijas de `AdminLayout` (`meta.requiresAuth`, `meta.title`) en `app/src/router/index.ts`; la navegación vive en `admin-nav.ts`. El rol viene de `useAuth` (campo `role` de `admins`). Si las features 005/006 no dejaron un guard por rol, esta tarea añade un `meta.roles` mínimo que el guard del router comprueba (verifica en disco antes).

## Alcance

- Crear `app/src/views/admin/AuditView.vue`: filtros (colección, actor, fecha desde/hasta), `DataTable` paginado (fecha local, actor, acción, colección, resumen) y un panel o diálogo con el diff del registro (`formatDiff`); estados vacío, carga y error.
- Ruta `audit` (`/audit`, `meta.title` «Auditoría», `meta.requiresAuth`, `meta.roles: ['owner']`); el guard redirige a `/` a quien no sea owner.
- `admin-nav.ts`: entrada `Auditoría` (icono `pi pi-history`) visible solo para owner; el tipo `NavItem` admite `roles?` y `AdminLayout` filtra por rol si aún no lo hacía; test de nav actualizado.

## Criterios de aceptación

- [ ] El owner ve la lista, filtra por colección, actor y rango de fechas y abre el diff de un registro.
- [ ] Un coach o recepcionista no ve la entrada de menú y al abrir `/audit` es redirigido a `/`.
- [ ] La API sigue respondiendo `403` a no-owners en `audit_logs` (comprobado con `curl`).
- [ ] `typecheck`, `lint`, `format:check`, `test` y `build` pasan.

## Referencias

- `features/012-dashboard-operativo/spec.md`, sección "Fase 3" → tarea 006.
- `app/src/router/index.ts`, `app/src/layouts/admin-nav.ts`, `app/src/composables/useAuth.ts`.

## Fuera de alcance

- Edición o borrado de registros de auditoría; alertas sobre eventos.

## Notas de implementación

