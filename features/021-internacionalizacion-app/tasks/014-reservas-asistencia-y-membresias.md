# 014 - [Web] Reservas, asistencia y membresías

- **Prioridad:** 14
- **Estado:** Pendiente
- **Depende de:** 009
- **Fase:** Fase 3: Migración del texto de la interfaz

## Objetivo

Todo el texto visible de reservas, asistencia y membresías está en inglés con traducción al español y las pruebas del módulo pasan en ambos idiomas.

## Contexto

Texto fijo en español en: `components/bookings/*`, `components/memberships/*`, `views/admin/MembershipsView.vue`, `composables/useBookings.ts`, `useMemberships.ts`, `lib/bookings.ts`, `lib/memberships.ts`. Los mapas de labels ya fueron migrados en 009 y los mensajes genéricos en 007. Los datos del usuario (nombres, notas, descripciones) no se traducen.

## Alcance

- Reescribir en inglés y envolver con `t()` (o `<i18n-t>` si hay marcado) textos, `placeholder`, `aria-label`, `header`, mensajes de toast y de confirmación, columnas y estados vacíos de los archivos listados.
- Plurales y contadores con `{count}` y `|`; sin concatenar fragmentos traducidos.
- Agregar las traducciones a `es.json` y ejecutar `bun run i18n:sort`.
- Actualizar pruebas: `bookings.test.ts`, `memberships.test.ts`, `MembershipsView.test.ts`, `lib/bookings.test.ts`. Verificar manualmente la vista en `en` y `es`.

## Criterios de aceptación

- [ ] `cd app && bun run lint`, `bun run typecheck` y `bun run test` pasan en verde.
- [ ] `bun run i18n:check` pasa en verde (sin claves faltantes ni huérfanas).
- [ ] Con `en` no queda texto en español en las vistas y componentes del alcance; con `es` el texto coincide con el actual.
- [ ] Sin `v-html` para texto traducido.

## Referencias

- `features/021-internacionalizacion-app/spec.md`, «Fase 3».

## Fuera de alcance

- Módulos de otras tareas de la Fase 3.

## Notas de implementación

