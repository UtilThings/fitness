# 004 - [Lib] Cliente `api.ts`, adaptadores y respaldo estático

- **Prioridad:** 4
- **Estado:** Completado
- **Depende de:** 002, 003
- **Fase:** Fase 2: Cliente y configuración en `web/`

## Objetivo

`web/` dispone de funciones que leen catálogo y horario desde la API, los convierten a los tipos actuales del sitio y, si la API falla, devuelven los datos estáticos sin lanzar errores.

## Contexto

`web/src/lib/data.ts` define `Plan` (precio en dólares enteros, `unit`, `sessions`, `freq`, `note`) y `ClassTemplate`, más los datos estáticos. La API devuelve precios en centavos y `billing_unit` (`per_4_weeks|per_class|first_visit`). Las páginas Astro se ejecutan en el build (Node) y las islas Vue en el navegador: el cliente debe funcionar en ambos (`fetch` global). Sin dependencias nuevas.

## Alcance

- Crear `web/src/lib/api.ts`: `fetchCatalog()` y `fetchSchedule(week)` usando `env.PUBLIC_API_URL` y `PUBLIC_API_TIMEOUT_MS` (`AbortController`), guardas de tipo para validar la forma de las respuestas, `ApiError` con causa; sin `credentials` y sin cabeceras personalizadas (evita preflight).
- Crear `web/src/lib/catalog.ts`: constante `SERVICE_SLUGS` con los slugs esperados de la feature 008, `toPlans(service)` (`price_cents / 100`; `per_4_weeks` → «per 4 weeks» o «per 4-week period» si `commitment_periods > 0`, `per_class` → «per class», `first_visit` → «first visit»; `sessions`/`per_week` → `sessions` y `freq`; `note` y compromiso → `note`), `toTemplates(service)` (hora `HH:mm` → «h:mm AM/PM») y `getCatalog()` que devuelve `{ source: 'api' | 'static', personalOneOnOne, personalPartner, groupPlans, jumpPlans, classTemplates }`, con respaldo a `data.ts` si falta `PUBLIC_API_URL`, la API falla, tarda o responde con forma inválida; nunca lanza.
- Pruebas `api.test.ts` y `catalog.test.ts` con `fetch` simulado: payload equivalente a los datos actuales produce exactamente `groupPlans`, `jumpPlans`, `personalOneOnOne`, `personalPartner` y `classTemplates`; tiempo de espera, `500`, JSON inválido, forma inválida y falta de `PUBLIC_API_URL` caen al respaldo con `source: 'static'`; ninguna llamada envía cookies.
- No modifica componentes ni páginas.

## Criterios de aceptación

- [x] Con un payload de la API equivalente a los precios actuales, `getCatalog()` devuelve los mismos planes que `data.ts` y `source: 'api'`.
- [x] Con la API caída, lenta (> timeout) o inválida, `getCatalog()` devuelve `source: 'static'` sin lanzar.
- [x] `fetchSchedule` rechaza respuestas con claves faltantes o de tipo incorrecto con `ApiError`.
- [x] El contrato JSON de ejemplo del spec pasa las guardas de tipo.
- [x] `bun run lint`, `format:check`, `check` y `test` en `web/` pasan.

## Referencias

- `features/019-catalogo-publico-en-web/spec.md`, sección "Fase 2" → tarea 004, y "Contrato HTTP".
- `web/src/lib/data.ts`, `web/src/lib/env.ts`.
- https://developer.mozilla.org/en-US/docs/Web/API/AbortController

## Fuera de alcance

- Componentes y páginas (005, 006).
- Eliminación de `data.ts` (permanece como respaldo).

## Notas de implementación

- Se verificaron paridad con el seed, errores HTTP, JSON y forma inválidos, timeout, ausencia de URL y contrato de ejemplo. Un build de Astro con una página temporal que llama a getCatalog y el puerto 9 inalcanzable generó el precio de respaldo. Pasaron 51 pruebas de web.
