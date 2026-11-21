# 008 - [Vista] Plantillas, bloqueos y enlace desde la ficha del coach

- **Prioridad:** 8
- **Estado:** Pendiente
- **Depende de:** 006, 007, Feature 007 (contrato)
- **Fase:** Fase 3: Interfaz

## Objetivo

El owner administra las plantillas semanales (incluida la asignación de coach) y los bloqueos por feriado, y desde la ficha de cada coach se salta a su horario.

## Contexto

La ficha del coach la crea la feature 007 (equipo y coaches); su archivo exacto (por contrato una vista de `app/src/views/admin/` del módulo de equipo) debe localizarse con `ls app/src/views/admin` antes de modificarla. `useSchedule` (tarea 006) ya expone `loadTemplates`, `loadBlocks` y `assignCoach`. Los coaches asignables son admins `active = true` con `role != "reception"` (el dueño también imparte).

## Alcance

- `app/src/views/admin/ClassTemplatesView.vue` (`/classes/templates`): `DataTable` agrupada por día (`rowGroupMode`), columnas hora, servicio, duración, cupo, coach y estado; `Dialog` de alta/edición; `ToggleSwitch` de activación; `Select` de coach en línea con casilla «Aplicar también a sesiones futuras» (llama a `assignCoach`); aviso de plantillas sin coach; solo lectura para roles distintos de owner.
- `app/src/views/admin/ScheduleBlocksView.vue` (`/classes/blocks`): `DataTable` de bloqueos (título, rango, motivo), alta/edición con dos `DatePicker` (fechas locales `YYYY-MM-DD`), y antes de guardar consulta cuántas sesiones `scheduled` caen en el rango y muestra `ConfirmDialog` «Se cancelarán N sesiones»; borrar un bloqueo avisa de que las sesiones ya canceladas no se reabren automáticamente.
- Rutas `classes-templates` y `classes-blocks` con `meta.title` en `app/src/router/index.ts`; entradas «Plantillas» y «Bloqueos» en `admin-nav.ts` (sin badges).
- Modificar la ficha del coach (feature 007): botón «Ver horario» que navega a `/classes?coach=<id>` y, si la vista de plantillas se abre con `?coach=<id>`, filtra por ese coach.
- Pruebas Vitest con composables simulados: render por día, asignación de coach con y sin aplicar a futuras, confirmación con conteo del bloqueo, rango inválido, solo lectura, y que el botón de la ficha navega con el parámetro correcto.

## Criterios de aceptación

- [ ] `/classes/templates` lista las 9 plantillas sembradas agrupadas por día; crear una plantilla activa genera sus sesiones.
- [ ] Asignar coach con «aplicar a futuras» actualiza las sesiones futuras y se ve en `/classes`.
- [ ] Crear un bloqueo muestra el número de sesiones a cancelar y, al confirmar, esas sesiones aparecen canceladas en `/classes`.
- [ ] `date_to` anterior a `date_from` se rechaza en el formulario y en el servidor.
- [ ] El botón de la ficha del coach abre `/classes?coach=<id>` con el filtro aplicado.
- [ ] Un usuario `coach` ve ambas vistas en solo lectura.
- [ ] `bun run test`, `typecheck`, `lint`, `format:check` y `build` pasan.

## Referencias

- `features/009-horarios-y-clases/spec.md`, "Fase 3" → tarea 008 y "Flujos Críticos" 5.
- `app/src/views/admin/ClassesView.vue` (patrón de la tarea 007).
- https://primevue.org/datatable/#rowgroup

## Fuera de alcance

- Reservas e inscritos (feature 011); notificación a inscritos (feature 018).

## Notas de implementación

<!-- Vacío al crear la tarea. -->
