# 015 - [Endpoint] Rutas públicas por business con clave

- **Prioridad:** 15
- **Estado:** Completado
- **Depende de:** 007, 010, 014
- **Fase:** Fase 3: API pública por clave

## Objetivo

`/api/public/catalog` y `/api/public/schedule` sirven solo datos del business dueño de la clave, con su zona y orígenes permitidos.

## Contexto

`api/src/hooks/public.ts` y `api/src/lib/public-store.ts` (019) cachean con claves globales `public:v1:*` y deciden CORS con `PUBLIC_SITE_ORIGINS`; `public-catalog.ts` contiene la lógica pura con `America/New_York` fija (`PUBLIC_SCHEDULE_MAX_WEEKS`). `web/src/lib/contract.test.ts` fija el contrato actual.

## Alcance

- Middleware que lee `X-Business-Key`, localiza el business por `public_key_prefix`, verifica el hash en tiempo constante y exige `active = true`; `401` uniforme en cualquier fallo.
- Filtrar servicios, planes, plantillas, sesiones y reservas por `business`; semana y horas en la zona del business; caché `public:v2:<business>:...`.
- CORS: reflejar el origen solo si está en `allowed_origins` del business; `Access-Control-Allow-Headers: X-Business-Key` en `OPTIONS`; `Vary: Origin`; `PUBLIC_SITE_ORIGINS` se retira (la migración 002 ya lo copió al business por defecto).
- Respuesta `version: 2` con objeto `business` (`name`, `city`, `logo_url`, `currency`, `timezone`); el resto del cuerpo no cambia.
- Pruebas: `public-catalog.test.ts` con zona distinta; casos de clave inválida, rotada, business inactivo, origen permitido/no permitido, preflight.
- Actualizar `scripts/verify-public.ts` y la sección pública de `scripts/verify-api.sh`.

## Criterios de aceptación

- [x] Sin cabecera, con clave inexistente, rotada o de business inactivo → `401` con el mismo cuerpo.
- [x] Con clave válida solo aparecen servicios, planes y sesiones del business; nunca de otro.
- [x] `Access-Control-Allow-Origin` solo para orígenes del business; el preflight permite `X-Business-Key`.
- [x] Dos business con la misma semana no comparten caché.
- [x] Sin claves `email`, `client`, `phone`, `notes` ni `id` en el cuerpo.
- [x] `bun run build:ts`, `bun test` y `scripts/verify-api.sh` pasan en verde.

## Fuera de alcance

- Cambios en `web/` (019).

## Referencias

- `features/020-multi-tenancy-business/spec.md`, sección "Fase 3: API pública por clave" → tarea 015.
- `features/019-catalogo-publico-en-web/spec.md` (contrato anterior)
- https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS

## Notas de implementación

Las rutas públicas verifican la clave antes de consultar la caché y devuelven v2 con datos públicos del negocio. Las pruebas de dos negocios comprueban 401 uniforme, aislamiento de catálogos y horarios, caché por negocio, CORS y ausencia de campos privados. El preflight comprueba el origen contra integraciones activas y el GET contra el negocio de la clave, porque el navegador no envía su valor en OPTIONS. `verify-api.sh` pasó con los datos de prueba actualizados para multi-tenancy. Build y 123 pruebas en verde.
