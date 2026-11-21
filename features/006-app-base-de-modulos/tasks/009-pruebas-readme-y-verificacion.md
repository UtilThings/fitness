# 009 - [Verificación] Pruebas, README y verify-app.sh

- **Prioridad:** 9
- **Estado:** Pendiente
- **Depende de:** 001, 002, 003, 004, 005, 006, 007, 008
- **Fase:** Fase 4

## Objetivo

La base de módulos está documentada, probada de punta a punta y la feature queda cerrada con `scripts/verify-app.sh` en verde.

## Contexto

`app/README.md` tiene secciones de estructura, convenciones y layouts. `scripts/verify-app.sh` ejecuta `bun install --frozen-lockfile`, `lint`, `format:check`, `typecheck`, `test` y `build`.

## Alcance

- Revisar cobertura: añadir las pruebas que falten de las tareas 001-008.
- Actualizar `app/README.md`: nueva sección «Módulos de administración» (receta de vista de listado con `useCollection`, `PageHeader`, `DataToolbar`, `StatusTag`, `EmptyState`, `useConfirmDelete`), permisos (`permissions.ts`, `can()`, `meta.roles`, 403), `datetime`/`money`, tipos y cómo activar una entrada de menú (retirar `placeholder`).
- Ejecutar `scripts/verify-app.sh` y corregir lo que falle.
- Cambiar el estado de la feature a `Completado` tras verificar los criterios.

## Criterios de aceptación

- [ ] `scripts/verify-app.sh` termina en verde.
- [ ] El README explica cómo añadir un módulo nuevo en menos de una página.
- [ ] Todas las tareas 001-008 figuran como `Completado`.

## Referencias

- `features/006-app-base-de-modulos/spec.md`, sección "Fase 4" → tarea 009.
- `scripts/verify-app.sh`.

## Fuera de alcance

- Verificación de `api/` (feature 005).

## Notas de implementación

