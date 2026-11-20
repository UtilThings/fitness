# 006 - [Docs] Dashboard, pruebas y cierre

- **Prioridad:** 6
- **Estado:** Completado
- **Depende de:** 004, 005
- **Fase:** Fase final: Verificación y cierre

## Objetivo

El panel inicial existe, la lógica nueva está probada y la documentación y la verificación reflejan los layouts.

## Contexto

`DashboardView` es la hija de `/` en `AdminLayout`. `scripts/verify-app.sh` ya existe (feature 003).

## Alcance

- `DashboardView`: título «Panel de administración» y una tarjeta de ejemplo.
- Pruebas: `useMediaQuery.test.ts` (cambio de `matches` con `matchMedia` simulado), `admin-nav.test.ts` (`to` únicos e internos, todo grupo con items) y ajuste de `router/index.test.ts`.
- `app/README.md`: estructura `layouts/`, `views/auth|admin`, cómo añadir una vista de auth o de admin y una entrada de menú.
- Ejecutar `scripts/verify-app.sh`; marcar la feature, las tareas y los criterios como completados.

## Criterios de aceptación

- [x] `scripts/verify-app.sh` termina en verde.
- [x] El README describe layouts y vistas por área.

## Referencias

- `features/004-app-layouts-auth-admin/spec.md`, sección "Fase final" → tarea 006.
- `scripts/verify-app.sh`

## Fuera de alcance

- Despliegue y CI.

## Notas de implementación

21 pruebas en 5 archivos. El criterio «`to` existentes en el router» se cambió por «internos y únicos» porque las entradas son marcadores. `scripts/verify-app.sh` en verde.
