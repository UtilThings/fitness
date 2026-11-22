# 007 - [Vista] Calendario semanal de clases

- **Prioridad:** 7
- **Estado:** Completado
- **Depende de:** 006
- **Fase:** Fase 3: Interfaz

## Objetivo

El personal ve las clases de la semana en hora de Miramar, filtra por servicio o coach y opera sobre cada sesión (cancelar, mover, cambiar coach, crear especial) desde `/classes`.

## Contexto

`admin-nav.ts` tiene el marcador «Clases» (`/classes`, badge falso `70`); esta tarea lo convierte en la entrada real y quita el badge. La referencia visual de comportamiento es `web/src/components/ScheduleBoard.vue` (selector de día, filtro por servicio, estados de disponibilidad) y `web/src/lib/schedule.ts`. En 009 no hay reservas: la tarjeta muestra el cupo, y las plazas ocupadas llegarán con la feature 011 (`availability` de `web/src/lib/data.ts` se reutilizará entonces). Las acciones de escritura se ocultan según `role` (la API es la barrera real): cancelar/mover para owner y reception, generar y plantillas solo owner.

## Alcance

- Crear `app/src/views/admin/ClassesView.vue`: cabecera con semana (rango «16 – 22 nov»), botones anterior/siguiente/«Hoy», filtro de servicio (`SelectButton` o `Select` con «Todos») y conmutador «Mis clases» (también `?coach=<id>` en la URL); siete columnas (una lista por día en móvil), tarjetas con hora, servicio, coach (o «Sin coach» resaltado), cupo y estado (`cancelled` tachada con motivo).
- `Drawer` de detalle: datos de la sesión, cancelar (diálogo con motivo obligatorio), mover (selector de fecha/hora, coach opcional, motivo), cambiar coach de la sesión y editar notas.
- Botón «Nueva sesión especial» (formulario: servicio, fecha/hora, duración, coach, cupo) y botón «Generar sesiones» para owner con resumen del resultado (`Toast`).
- Ruta `classes` (`meta.title: 'Clases'`, `meta.requiresAuth`) en `app/src/router/index.ts`; en `admin-nav.ts` entrada «Clases» sin badge (las entradas «Plantillas» y «Bloqueos» las añade la tarea 008 cuando existan sus rutas).
- Pruebas Vitest con `useSchedule` simulado: render de la semana, filtro por servicio, «Mis clases», cancelación con y sin motivo, ocultar acciones al rol `coach`.

## Criterios de aceptación

- [x] `/classes` muestra las 9 sesiones semanales sembradas (tras generar) en sus días y horas locales correctas, también en la semana del cambio de horario.
- [x] El filtro por servicio y «Mis clases» limitan las tarjetas; `?coach=<id>` preselecciona el filtro.
- [x] Se puede navegar a semanas pasadas y futuras.
- [x] Cancelar exige motivo y la tarjeta pasa a cancelada; mover crea la nueva en su día.
- [x] El rol `coach` no ve botones de cancelar, mover ni generar.
- [x] Sin sesión redirige a `/login?redirect=...`; el badge falso `70` desaparece.
- [x] `bun run test`, `typecheck`, `lint`, `format:check` y `build` pasan.

## Referencias

- `features/009-horarios-y-clases/spec.md`, "Fase 3" → tarea 007.
- `web/src/components/ScheduleBoard.vue`, `web/src/lib/schedule.ts`.
- https://primevue.org/drawer/

## Fuera de alcance

- Plantillas y bloqueos (008); reservas y ocupación real (feature 011); arrastrar y soltar.

## Notas de implementación

Verificados 136 tests, tipos, lint, formato y build. Las pruebas renderizan las nueve franjas en la semana del cambio de hora, filtran por servicio y coach, navegan en ambas direcciones, cancelan y mueven sesiones. El botón de generación inicia la ventana en el domingo de la semana visible.
