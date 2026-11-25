# 016 - [Web] Coaching y agenda de coaches

- **Prioridad:** 16
- **Estado:** Completado
- **Depende de:** 009
- **Fase:** Fase 3: Migración del texto de la interfaz

## Objetivo

Todo el texto visible de coaching y agenda está en inglés con traducción al español y las pruebas del módulo pasan en ambos idiomas.

## Contexto

Texto fijo en español en: `views/admin/CoachingView.vue`, `CoachAgendaView.vue`, `components/coaching/*`, `components/agenda/*`, `composables/useCoaching.ts`, `useCoachAgenda.ts`, `useSessionAvailability.ts`, `lib/coaching.ts`, `lib/agenda.ts`. Los mapas de labels ya fueron migrados en 009 y los mensajes genéricos en 007. Los datos del usuario (nombres, notas, descripciones) no se traducen.

## Alcance

- Reescribir en inglés y envolver con `t()` (o `<i18n-t>` si hay marcado) textos, `placeholder`, `aria-label`, `header`, mensajes de toast y de confirmación, columnas y estados vacíos de los archivos listados.
- Plurales y contadores con `{count}` y `|`; sin concatenar fragmentos traducidos.
- Agregar las traducciones a `es.json` y ejecutar `bun run i18n:sort`.
- Actualizar pruebas: `CoachingView.test.ts`, `CoachingComponents.test.ts`, `CoachAgendaView.test.ts`, `agenda.test.ts`. Verificar manualmente la vista en `en` y `es`.

## Criterios de aceptación

- [x] `cd app && bun run lint`, `bun run typecheck` y `bun run test` pasan en verde.
- [x] `bun run i18n:check` pasa en verde (sin claves faltantes ni huérfanas).
- [x] Con `en` no queda texto en español en las vistas y componentes del alcance; con `es` el texto coincide con el actual.
- [x] Sin `v-html` para texto traducido.

## Referencias

- `features/021-internacionalizacion-app/spec.md`, «Fase 3».

## Fuera de alcance

- Módulos de otras tareas de la Fase 3.

## Notas de implementación

Lint, comprobación de tipos, catálogo y suite completa en verde. Revisados los programas, check-ins, agenda, disponibilidad y diálogos de sesiones. Los mensajes con nombres, semanas y horas conservan los datos mediante variables nombradas.
