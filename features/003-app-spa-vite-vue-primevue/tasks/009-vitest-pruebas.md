# 009 - [Pruebas] Vitest y Vue Test Utils

- **Prioridad:** 9
- **Estado:** Completado
- **Depende de:** 005, 006, 007
- **Fase:** Fase 4: Calidad

## Objetivo

La lógica clave del boilerplate (validación de entorno, autenticación y guard) tiene pruebas automatizadas que se ejecutan con `bun run test`.

## Contexto

`vitest`, `@vue/test-utils` y `happy-dom` ya están instalados. Existen `parseEnv` (005), `useAuth` (006) y el router con `safeRedirect` (007). Usar siempre `bun run test`, nunca `bun test`.

## Alcance

- Crear `app/vitest.config.ts` con `mergeConfig(viteConfig, defineConfig({ test: { environment: 'happy-dom' } }))`.
- `src/lib/env.test.ts`: URL válida; variable faltante (mensaje con `VITE_POCKETBASE_URL`); URL inválida; barra final eliminada.
- `src/composables/useAuth.test.ts`: con `vi.mock('@/lib/pocketbase')` simulando `authWithPassword` y `authStore`; login correcto, login fallido (propaga el error) y logout.
- `src/router/index.test.ts`: guard (sin sesión → `/login?redirect=...`; con sesión en `/login` → `/`) y `safeRedirect` (casos internos, `//host`, URL absoluta, vacío).
- Scripts: `test` (`vitest run`) y `test:watch`.

## Criterios de aceptación

- [x] `bun run test` pasa con los casos indicados.
- [x] Romper `safeRedirect` (p. ej. aceptar `//host`) hace fallar una prueba (comprobación manual, revertida).
- [x] `bun run lint`, `format:check` y `typecheck` siguen en verde con los archivos de prueba.

## Referencias

- `features/003-app-spa-vite-vue-primevue/spec.md`, sección "Fase 4" → tarea 009.
- https://vitest.dev/guide/
- https://test-utils.vuejs.org/

## Fuera de alcance

- Pruebas de componentes de vista con montaje completo y pruebas e2e.

## Notas de implementación

12 pruebas en 3 archivos. `vitest.config.ts` importa `./vite.config.ts` con extensión (si no, Vite avisa por `configLoader: native`), lo que exigió `allowImportingTsExtensions` en `tsconfig.node.json`.
