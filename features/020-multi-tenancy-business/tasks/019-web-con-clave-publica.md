# 019 - [Web] `web/` con clave pública del business

- **Prioridad:** 19
- **Estado:** Pendiente
- **Depende de:** 015
- **Fase:** Fase 5: Sitio público

## Objetivo

El sitio Astro se integra como el primer sitio de un business: envía su clave pública y consume el contrato `version: 2`, con respaldo estático si falla.

## Contexto

`web/src/lib/env.ts` valida `PUBLIC_SITE_URL` y `PUBLIC_API_URL`; `web/src/lib/api.ts` consume `catalog` y `schedule` con tiempo de espera, validación de forma y respaldo (019); `web/Dockerfile` recibe los ARG de build; `web/src/lib/contract.test.ts` fija el contrato. El sitio responde a un solo business.

## Alcance

- `env.ts`: `PUBLIC_BUSINESS_KEY` (obligatoria cuando `PUBLIC_API_URL` está definida); `.env.example` y `Dockerfile` (ARG nuevo); la clave es visible en el bundle y así se documenta.
- `api.ts`: cabecera `X-Business-Key` en todas las llamadas; validar `version: 2`; `401` y errores caen al respaldo sin romper el build; `business.currency` alimenta `formatPrice` en lugar de `USD` fijo.
- Nombre y ciudad del business tomados de la API con respaldo local donde el sitio los muestre.
- Actualizar `api.test.ts`, `contract.test.ts`, `env.test.ts` y `tests/dist`; sin cambios visuales.

## Criterios de aceptación

- [ ] Con clave válida, el build renderiza los precios reales y el navegador revalida enviando la cabecera.
- [ ] Con clave inválida o API caída, el build termina y usa el respaldo estático.
- [ ] Sin `PUBLIC_BUSINESS_KEY` y con `PUBLIC_API_URL` definida, `parseEnv` falla con mensaje claro.
- [ ] `bun run lint`, `format:check`, `check`, `test`, `build` y `test:dist` pasan en verde.

## Fuera de alcance

- Hacer `web/` multi-business: cada business tiene su propio sitio.

## Referencias

- `features/020-multi-tenancy-business/spec.md`, sección "Fase 5: Sitio público" → tarea 019.
- `web/src/lib/api.ts`, `web/src/lib/env.ts`, `web/Dockerfile`

## Notas de implementación

<!-- Vacío al crear la tarea. Al completarla, registra archivos creados/modificados, decisiones, desviaciones y hallazgos pendientes. -->
