# 007 - [Módulo] Errores, notificaciones y diálogos genéricos

- **Prioridad:** 7
- **Estado:** Pendiente
- **Depende de:** 002, 003, 005
- **Fase:** Fase 2: Utilidades transversales

## Objetivo

Los mensajes genéricos de error, éxito y confirmación del app salen de `t()` y `parsePbError` traduce los mensajes del API que estén catalogados.

## Contexto

`lib/pb-errors.ts` devuelve textos fijos en español (`Sin conexión con el servidor`, `No tienes permiso`, …) y pasa `response.message` tal cual. Los composables `useNotify`, `useConfirmDelete`, `useCollection`, `useCatalogActions`, `useClients`, `useAuditLogs`, `usePayments` y `useMemberships` contienen mensajes en español.

## Alcance

- Reescribir en inglés y envolver con `t()` los literales de `lib/pb-errors.ts` y de los composables listados; agregar sus traducciones a `es.json`.
- `parsePbError`: `message = te(msg) ? t(msg) : msg` para el mensaje del servidor; `fieldMessages` aplica el mismo criterio por campo. La traducción real de mensajes del API llega en 023; aquí queda el mecanismo y la prueba con un mensaje de ejemplo.
- Actualizar `pb-errors.test.ts`, `useNotify.test.ts`, `useConfirmDelete.test.ts`, `useCollection.test.ts`.
- No toca vistas ni componentes (008-018).

## Criterios de aceptación

- [ ] `cd app && bun run lint`, `bun run typecheck` y `bun run test` pasan en verde.
- [ ] `bun run i18n:check` pasa en verde (sin claves faltantes ni huérfanas).
- [ ] Un mensaje catalogado del servidor se muestra traducido en `es`; uno no catalogado se muestra tal cual.
- [ ] Cambiar el idioma no requiere recrear los composables (los mensajes se evalúan al usarse, no al importarse).

## Referencias

- `app/src/lib/pb-errors.ts`

## Fuera de alcance

- Catálogo de mensajes del API (023).

## Notas de implementación

