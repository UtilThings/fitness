# 013 - [Web] Clientes

- **Prioridad:** 13
- **Estado:** Completado
- **Depende de:** 009
- **Fase:** Fase 3: Migración del texto de la interfaz

## Objetivo

Todo el texto visible de clientes está en inglés con traducción al español y las pruebas del módulo pasan en ambos idiomas.

## Contexto

Texto fijo en español en: `views/admin/ClientsView.vue`, `ClientDetailView.vue`, `components/clients/*`, `composables/useClients.ts`, `lib/clients.ts` (el campo «Idioma de comunicaciones» del cliente conserva `Español`/`English`). Los mapas de labels ya fueron migrados en 009 y los mensajes genéricos en 007. Los datos del usuario (nombres, notas, descripciones) no se traducen.

## Alcance

- Reescribir en inglés y envolver con `t()` (o `<i18n-t>` si hay marcado) textos, `placeholder`, `aria-label`, `header`, mensajes de toast y de confirmación, columnas y estados vacíos de los archivos listados.
- Plurales y contadores con `{count}` y `|`; sin concatenar fragmentos traducidos.
- Agregar las traducciones a `es.json` y ejecutar `bun run i18n:sort`.
- Actualizar pruebas: `ClientsView.test.ts`, `ClientDetailView.test.ts`, `clients.test.ts`, `lib/clients.test.ts`. Verificar manualmente la vista en `en` y `es`.

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

Lint, comprobación de tipos, catálogo y suite completa en verde. Las pruebas cubren listado, ficha, evaluación e historial. El selector del idioma de comunicaciones conserva los nombres de idioma y las etiquetas del módulo reaccionan al idioma de interfaz.
