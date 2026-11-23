# 003 - [Config] Variables de entorno de `web/` para la API

- **Prioridad:** 3
- **Estado:** Completado
- **Depende de:** Ninguna
- **Fase:** Fase 2: Cliente y configuración en `web/`

## Objetivo

`web/` valida y documenta las variables que controlan el acceso a la API pública, y el build de Docker las recibe.

## Contexto

`web/src/lib/env.ts` exporta `parseEnv` (con `PUBLIC_SITE_URL` obligatoria y `PUBLIC_API_URL` opcional, sin uso hasta ahora) y `env`. `web/src/env.d.ts` tipa `ImportMetaEnv`. El `Dockerfile` ya declara `ARG`/`ENV` de `PUBLIC_SITE_URL` y `PUBLIC_API_URL`; las `PUBLIC_*` se incrustan al compilar y quedan visibles en el cliente (no deben contener secretos). `web/deploy.json` pasa `args` al build.

## Alcance

- Modificar `web/src/lib/env.ts`: `PUBLIC_API_TIMEOUT_MS` (entero entre 500 y 15000, por defecto 4000), validado en `parseEnv` con mensajes que nombran la variable; mantener `PUBLIC_API_URL` opcional (sin ella el sitio usa solo datos estáticos); exportar `env.PUBLIC_API_URL` sin barra final.
- Actualizar `web/src/env.d.ts`, `web/.env.example` (con comentarios en español), `web/Dockerfile` (ARG/ENV de `PUBLIC_API_TIMEOUT_MS`) y `web/deploy.json` (argumento `PUBLIC_API_URL` de producción, marcador documentado si aún no se conoce).
- Pruebas `web/src/lib/env.test.ts`: valores válidos, falta de `PUBLIC_API_URL`, `PUBLIC_API_TIMEOUT_MS` fuera de rango o no numérico, barra final eliminada.
- Sin cambios en componentes.

## Criterios de aceptación

- [x] `parseEnv` rechaza `PUBLIC_API_TIMEOUT_MS=abc`, `100` y `60000` nombrando la variable.
- [x] Sin `PUBLIC_API_URL`, `parseEnv` no falla y `env.PUBLIC_API_URL` es `undefined`.
- [x] `PUBLIC_API_URL=https://api.example.com/` se normaliza sin barra final.
- [x] `docker build` con `--build-arg PUBLIC_SITE_URL=... --build-arg PUBLIC_API_URL=...` conserva el valor en el bundle.
- [x] `bun run lint`, `format:check`, `check` y `test` en `web/` pasan.

## Referencias

- `features/019-catalogo-publico-en-web/spec.md`, sección "Fase 2" → tarea 003.
- `web/src/lib/env.ts`, `web/Dockerfile`, `web/deploy.json`.
- https://docs.astro.build/en/guides/environment-variables/

## Fuera de alcance

- Cliente de la API (004).
- Variables del lado de PocketBase (`PUBLIC_SITE_ORIGINS`, tarea 002).

## Notas de implementación

- El argumento PUBLIC_API_URL de deploy.json queda vacío hasta disponer de la URL pública de PocketBase. Una compilación Docker con una página temporal confirmó que el valor del argumento se incrusta en el JavaScript entregado al navegador. Lint, formato, tipos y 39 pruebas pasaron.
