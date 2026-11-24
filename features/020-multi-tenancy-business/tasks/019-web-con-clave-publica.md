# 019 - [Web] `web/` con clave pública del business

- **Prioridad:** 19
- **Estado:** Completado
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

- [x] Con clave válida, el build renderiza los precios reales y el navegador revalida enviando la cabecera.
- [x] Con clave inválida o API caída, el build termina y usa el respaldo estático.
- [x] Sin `PUBLIC_BUSINESS_KEY` y con `PUBLIC_API_URL` definida, `parseEnv` falla con mensaje claro.
- [x] `bun run lint`, `format:check`, `check`, `test`, `build` y `test:dist` pasan en verde.

## Fuera de alcance

- Hacer `web/` multi-business: cada business tiene su propio sitio.

## Referencias

- `features/020-multi-tenancy-business/spec.md`, sección "Fase 5: Sitio público" → tarea 019.
- `web/src/lib/api.ts`, `web/src/lib/env.ts`, `web/Dockerfile`

## Notas de implementación

Astro envía `X-Business-Key` y valida v2. La marca, ciudad y moneda se toman del payload, con datos locales de respaldo. Las pruebas de Vue comprueban la revalidación con cabecera y COP. La prueba de compilación usó una API local y comprobó nombre, ciudad y precios reales con clave válida, y precios de respaldo con 401 o conexión caída. La clave se incorpora a los archivos públicos del build. `verify-web.sh` pasó con lint, formato, check, 62 pruebas, build y pruebas de dist.
