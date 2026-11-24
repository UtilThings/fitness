# 015 - [Endpoint] Rutas públicas por business con clave

- **Prioridad:** 15
- **Estado:** Pendiente
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

- [ ] Sin cabecera, con clave inexistente, rotada o de business inactivo → `401` con el mismo cuerpo.
- [ ] Con clave válida solo aparecen servicios, planes y sesiones del business; nunca de otro.
- [ ] `Access-Control-Allow-Origin` solo para orígenes del business; el preflight permite `X-Business-Key`.
- [ ] Dos business con la misma semana no comparten caché.
- [ ] Sin claves `email`, `client`, `phone`, `notes` ni `id` en el cuerpo.
- [ ] `bun run build:ts`, `bun test` y `scripts/verify-api.sh` pasan en verde.

## Fuera de alcance

- Cambios en `web/` (019).

## Referencias

- `features/020-multi-tenancy-business/spec.md`, sección "Fase 3: API pública por clave" → tarea 015.
- `features/019-catalogo-publico-en-web/spec.md` (contrato anterior)
- https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS

## Notas de implementación

<!-- Vacío al crear la tarea. Al completarla, registra archivos creados/modificados, decisiones, desviaciones y hallazgos pendientes. -->
