# 005 - [Config] Variables de entorno tipadas

- **Prioridad:** 5
- **Estado:** Completado
- **Depende de:** 001, 002
- **Fase:** Fase 2: Integraciones

## Objetivo

La configuración de entorno de la SPA está tipada, documentada y validada: una variable faltante o inválida produce un error que la nombra.

## Contexto

Vite expone al navegador solo las variables con prefijo `VITE_` mediante `import.meta.env`. `web/` aplica la misma idea con `src/lib/env.ts` como único lector.

## Alcance

- Crear `app/.env.example` con `VITE_POCKETBASE_URL=http://127.0.0.1:8090` y un comentario de cada variable.
- Crear `app/src/env.d.ts` con `/// <reference types="vite/client" />` y la interfaz `ImportMetaEnv`.
- Crear `app/src/lib/env.ts`: función pura `parseEnv(raw)` que valida `VITE_POCKETBASE_URL` (obligatoria, URL `http(s)` válida, sin barra final) y lanza `Error` con el nombre de la variable; exporta `env = parseEnv(import.meta.env)` con `pocketbaseUrl`.
- Crear localmente `app/.env` a partir del ejemplo (ignorado por git).

## Criterios de aceptación

- [x] `env.pocketbaseUrl` está tipado como `string`.
- [x] `parseEnv({})` lanza un error cuyo mensaje contiene `VITE_POCKETBASE_URL`; una URL inválida también.
- [x] `.env` está ignorado y `.env.example` versionado.
- [x] `bun run typecheck` pasa.

## Referencias

- `features/003-app-spa-vite-vue-primevue/spec.md`, sección "Fase 2" → tarea 005.
- https://vite.dev/guide/env-and-mode

## Fuera de alcance

- Pruebas de `parseEnv` (tarea 009).

## Notas de implementación

Se creó `.env` local (ignorado). `env.ts` valida en tiempo de ejecución al importarse, por lo que el build no falla si falta la variable; el spec se ajustó.
