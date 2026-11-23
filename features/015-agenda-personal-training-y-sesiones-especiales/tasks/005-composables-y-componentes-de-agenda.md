# 005 - [Componente] Composables y componentes de agenda

- **Prioridad:** 5
- **Estado:** Completado
- **Depende de:** 004
- **Fase:** Fase 4: Interfaz

## Objetivo

La app dispone de composables y componentes para editar disponibilidad, ver una agenda por coach y crear sesiones privadas y especiales.

## Contexto

`pb` y `pb.send` se usan desde composables; la hora local se maneja con `app/src/lib/datetime.ts` (`Intl`) y las fechas se guardan en UTC. PrimeVue 5, textos en español. El componente de calendario de 009 existe por contrato (verificar nombre).

## Alcance

- Crear `app/src/composables/useCoachAvailability.ts` (CRUD de tramos, agrupación por día) y `useCoachAgenda.ts` (sesiones por coach y rango día/semana con `expand` de reservas y clientes, y tramos del coach).
- Crear en `app/src/components/agenda/`: `AvailabilityEditor.vue` (por día, varios tramos, validación de solapes en cliente), `CoachAgendaGrid.vue` (columna por día o vista de un día; sesiones como bloques con cliente/s y cupo; franjas de disponibilidad), `PrivateSessionDialog.vue` (coach, servicio, fecha/hora, 1-2 clientes, aviso de elegibilidad con `GET /eligibility` de 013, errores por código) y `SpecialSessionDialog.vue` (título, servicio, fecha, duración, capacidad, coach opcional, notas).
- Pruebas Vitest: composables (mock), validación de solapes del editor, mapeo de errores `coach_conflict`/`outside_availability` a mensajes, agrupación de la agenda por día.

## Criterios de aceptación

- [x] El editor impide guardar tramos solapados o con fin ≤ inicio.
- [x] El diálogo de privada muestra un mensaje claro por cada código de error del servidor.
- [x] La cuadrícula muestra correctamente sesiones en zona `America/New_York` también cerca de medianoche.
- [x] `bun run test`, `lint`, `format:check`, `typecheck` y `build` pasan.

## Referencias

- `features/015-agenda-personal-training-y-sesiones-especiales/spec.md`, "Fase 4" → tarea 005.

## Fuera de alcance

- Vistas, rutas y calendario de 009 (006, 007).

## Notas de implementación

La cuadrícula y los formularios usan la hora de Miramar (America/New_York). El diálogo privado consulta disponibilidad y elegibilidad antes de enviar, y muestra los errores de la validación definitiva. La suite de la app pasó con los casos nuevos de tramos, agenda y errores.
