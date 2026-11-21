# 005 - [Vista] `/coaching` con filtros y alertas

- **Prioridad:** 5
- **Estado:** Pendiente
- **Depende de:** 004
- **Fase:** Fase 4: Interfaz

## Objetivo

El staff ve todos los programas de Online Coaching con sus alertas de renovación y de check-in, y registra seguimiento desde una sola vista.

## Contexto

Rutas protegidas hijas de `AdminLayout` con `meta.requiresAuth` y `meta.title`; navegación solo en `app/src/layouts/admin-nav.ts`. Un coach ve por defecto sus propios programas; owner y reception ven todos.

## Alcance

- Crear `app/src/views/admin/CoachingView.vue`: resumen superior (programas activos, por renovar, sin check-in, en riesgo), tabla con cliente, coach, estado, semana X de N, adherencia promedio y tendencia, último check-in, renovación y alertas; filtros por estado, coach, alerta y búsqueda por cliente.
- Panel lateral/diálogo de detalle: datos del programa, `program_url`, notas, `CheckinTimeline` y botones "Registrar check-in", "Pausar/Reanudar", "Finalizar", "Editar".
- Botón "Nuevo programa" con `ProgramFormDialog`.
- Ruta `/coaching` (`meta.title: "Online Coaching"`) y entrada real en `admin-nav.ts` (retirar marcador sustituido).
- Pruebas Vitest: filtros, resumen, ruta y nav, ocultar acciones de check-in a reception.

## Criterios de aceptación

- [ ] Los filtros por estado, coach y alerta devuelven los programas esperados.
- [ ] Registrar un check-in desde el detalle actualiza adherencia y limpia la alerta pendiente.
- [ ] Un coach ve por defecto solo sus programas; reception no ve el botón de check-in.
- [ ] Sin sesión, `/coaching` redirige a login.
- [ ] `bun run test`, `lint`, `format:check`, `typecheck` y `build` pasan.

## Referencias

- `features/016-online-coaching/spec.md`, "Fase 4" → tarea 005.

## Fuera de alcance

- Pestaña del perfil (006).

## Notas de implementación

<!-- Vacío al crear la tarea. -->
