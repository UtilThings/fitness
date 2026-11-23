# 006 - [Vista] Disponibilidad y agenda por coach

- **Prioridad:** 6
- **Estado:** Completado
- **Depende de:** 005
- **Fase:** Fase 4: Interfaz

## Objetivo

El staff define la disponibilidad de cada coach y consulta su agenda por día o semana desde la navegación.

## Contexto

Rutas protegidas hijas de `AdminLayout` con `meta.requiresAuth` y `meta.title`; navegación solo en `app/src/layouts/admin-nav.ts`. Los coaches (007) vienen de `admins`. Un coach solo edita su propia disponibilidad; owner y reception eligen el coach; reception solo lee la disponibilidad.

## Alcance

- Crear `app/src/views/admin/CoachAgendaView.vue` (`/agenda`): selector de coach (por defecto el propio si es coach), conmutador día/semana, navegación anterior/siguiente/hoy, `CoachAgendaGrid`, botón "Sesión privada" y detalle de sesión (reservas, asistencia link a 011).
- Crear `app/src/views/admin/CoachAvailabilityView.vue` (`/agenda/disponibilidad`): `AvailabilityEditor` por coach con control de permisos por rol.
- Rutas en `router/index.ts` y entrada real "Agenda" en `admin-nav.ts` (retirar marcadores sustituidos).
- Pruebas Vitest: rutas y nav, permisos de edición por rol, cambio día/semana.

## Criterios de aceptación

- [x] `/agenda` muestra sesiones y disponibilidad del coach elegido, en día y semana.
- [x] Un coach no puede editar la disponibilidad de otro; reception ve el editor en solo lectura.
- [x] Sin sesión, las rutas redirigen a login.
- [x] `bun run test`, `lint`, `format:check`, `typecheck` y `build` pasan.

## Referencias

- `features/015-agenda-personal-training-y-sesiones-especiales/spec.md`, "Fase 4" → tarea 006.

## Fuera de alcance

- Alta de especiales desde el calendario de 009 (007).

## Notas de implementación

La agenda enlaza el detalle de reservas y asistencia con el calendario existente. Recepción y los coaches que consultan a otro coach tienen lectura de disponibilidad. Las rutas, los permisos y el cambio día/semana están cubiertos por Vitest.
