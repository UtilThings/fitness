# 004 - [Config] Variables de entorno tipadas

- **Prioridad:** 4
- **Estado:** Pendiente
- **Depende de:** 001
- **Fase:** Fase 1: Base del proyecto

## Objetivo

Las variables de entorno están documentadas, tipadas y validadas en un único módulo; una variable obligatoria ausente falla con un mensaje claro.

## Contexto

Astro expone al cliente solo variables con prefijo `PUBLIC_` mediante `import.meta.env`. Convención del spec: solo `src/lib/env.ts` lee `import.meta.env`. Si `src/lib/` aún no existe, crearla.

## Alcance

- Crear `web/.env.example` con `PUBLIC_SITE_URL=http://localhost:4321` y `PUBLIC_API_URL=http://localhost:8080` (comentados y sin secretos).
- Crear/modificar `web/src/env.d.ts` declarando `ImportMetaEnv` con ambas variables.
- Crear `web/src/lib/env.ts`: función pura `parseEnv(raw)` que valida (URL válida, obligatoria `PUBLIC_SITE_URL`; `PUBLIC_API_URL` opcional) y lanza `Error` nombrando la variable; exporta `env = parseEnv(import.meta.env)`.
- Modificar `web/astro.config.mjs`: `site` tomado de `PUBLIC_SITE_URL` (con valor por defecto de desarrollo si no existe).
- Límites: las pruebas de `parseEnv` se escriben en la tarea 007.

## Criterios de aceptación

- [ ] `.env.example` lista todas las variables usadas.
- [ ] `parseEnv({})` lanza un error que menciona `PUBLIC_SITE_URL`.
- [ ] `parseEnv` con una URL inválida lanza un error que nombra la variable.
- [ ] `bun run build` pasa con un `.env` copiado desde `.env.example`.
- [ ] Ningún valor sensible aparece en archivos versionados.

## Referencias

- `features/001-web-astro-vue-boilerplate/spec.md`, sección "Fase 1" → tarea 004.
- https://docs.astro.build/en/guides/environment-variables/

## Fuera de alcance

- Pruebas de `env.ts` (tarea 007) y variables de servidor/secretos (no hay SSR).

## Notas de implementación

<!-- Se completa al terminar la tarea. -->
