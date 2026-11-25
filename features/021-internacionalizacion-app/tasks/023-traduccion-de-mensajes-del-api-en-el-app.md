# 023 - [Módulo] Traducción de mensajes del API en el app

- **Prioridad:** 23
- **Estado:** Completado
- **Depende de:** 007, 020, 021, 022, 018
- **Fase:** Fase 4: Mensajes del API

## Objetivo

Los errores y la auditoría que vienen del API se muestran en el idioma de la interfaz.

## Contexto

`parsePbError` ya traduce los mensajes catalogados (007). 020-022 dejaron el API en inglés y su lista final en `docs/i18n.md`. `lib/audit.ts` y `AuditView` muestran `description` de `audit_logs` (las filas históricas están en español y no se migran).

## Alcance

- Agregar a `es.json` la traducción de cada mensaje de la lista de `docs/i18n.md` (clave = mensaje exacto del API).
- `lib/audit.ts`: traducir `description` cuando la clave exista en el catálogo; si no, mostrar el texto guardado.
- Prueba `app/src/lib/api-messages.test.ts`: lee la lista de mensajes del API (extraída de `api/src` con el mismo patrón que `i18n:check`) y comprueba que todos tienen traducción; falla si el API agrega un mensaje sin traducir.
- Extender `i18n:check` con la opción `--api` que incluya los mensajes del API como claves esperadas.

## Criterios de aceptación

- [x] `cd app && bun run lint`, `bun run typecheck` y `bun run test` pasan en verde.
- [x] `bun run i18n:check` pasa en verde (sin claves faltantes ni huérfanas).
- [x] Un `403` del API se muestra en español con `es` y en inglés con `en`.
- [x] La prueba de cobertura falla si se agrega un mensaje al API sin su traducción.
- [x] Una descripción de auditoría histórica en español se muestra sin cambios.

## Referencias

- `features/021-internacionalizacion-app/spec.md`, «Mensajes del API».

## Fuera de alcance

- Migración de datos históricos de auditoría.

## Notas de implementación

El verificador y las pruebas extraen mensajes de api/src. Pasaron lint, comprobación de tipos, suites del app y API y compilación de hooks. Los casos bilingües confirman un 403, una clave de auditoría y un registro histórico conservado.
