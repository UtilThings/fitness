# 004 - [Componente] Composable `useCoaching` y componentes de coaching

- **Prioridad:** 4
- **Estado:** Pendiente
- **Depende de:** 002, 003
- **Fase:** Fase 4: Interfaz

## Objetivo

La app dispone de un composable y de componentes para crear programas, registrar check-ins y mostrar adherencia y alertas.

## Contexto

`pb` (`app/src/lib/pocketbase.ts`) accede a las colecciones; los datos de cliente, coach y membresía se cargan con `expand`. La lógica de alertas y adherencia se reutiliza de la lib de coaching (tarea 002) para no duplicarla. PrimeVue 5, textos en español.

## Alcance

- Crear `app/src/composables/useCoaching.ts`: `listPrograms(filters)` (estado, coach, alerta), `getProgram`, `createProgram`, `updateProgram`, `setStatus`, `listCheckins(programId)`, `createCheckin`; calcula `flags` (alertas, adherencia, semana) por programa.
- Crear en `app/src/components/coaching/`: `ProgramStatusTag.vue`, `AdherenceBadge.vue` (1-5 con color y promedio con tendencia), `CheckinTimeline.vue`, `ProgramFormDialog.vue` (cliente con membresía online activa, coach, `duration_weeks` 8/12/16, objetivo, `program_url`, notas) y `CheckinDialog.vue` (fecha, adherencia con `Rating`/botones 1-5, notas).
- Pruebas Vitest: `useCoaching` (mocks y cálculo de flags), `AdherenceBadge`, validaciones de los diálogos.

## Criterios de aceptación

- [ ] El diálogo de check-in no permite adherencia fuera de 1-5 ni fecha futura.
- [ ] El diálogo de programa solo ofrece clientes con membresía online activa.
- [ ] Las alertas calculadas coinciden con las de la lib en los casos de prueba.
- [ ] `bun run test`, `lint`, `format:check`, `typecheck` y `build` pasan.

## Referencias

- `features/016-online-coaching/spec.md`, "Fase 4" → tarea 004.

## Fuera de alcance

- Vistas y rutas (005, 006).

## Notas de implementación

<!-- Vacío al crear la tarea. -->
