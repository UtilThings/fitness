# 010 - [Web] Equipo y perfil

- **Prioridad:** 10
- **Estado:** Pendiente
- **Depende de:** 009
- **Fase:** Fase 3: Migración del texto de la interfaz

## Objetivo

Todo el texto visible de equipo y perfil está en inglés con traducción al español y las pruebas del módulo pasan en ambos idiomas.

## Contexto

Texto fijo en español en: `views/admin/TeamView.vue`, `TeamMemberView.vue`, `ProfileView.vue`, `components/team/*` (`MemberForm`, `RolePermissions`, `MemberAvatar`), `composables/useTeam.ts`, `useAdminAvatar.ts`. Los mapas de labels ya fueron migrados en 009 y los mensajes genéricos en 007. Los datos del usuario (nombres, notas, descripciones) no se traducen.

## Alcance

- Reescribir en inglés y envolver con `t()` (o `<i18n-t>` si hay marcado) textos, `placeholder`, `aria-label`, `header`, mensajes de toast y de confirmación, columnas y estados vacíos de los archivos listados.
- Plurales y contadores con `{count}` y `|`; sin concatenar fragmentos traducidos.
- Agregar las traducciones a `es.json` y ejecutar `bun run i18n:sort`.
- Actualizar pruebas: `TeamView.test.ts`, `TeamMemberView.test.ts`, `ProfileView.test.ts`. Verificar manualmente la vista en `en` y `es`.

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

