# 008 - [Config] ESLint y Prettier

- **Prioridad:** 8
- **Estado:** Completado
- **Depende de:** 001
- **Fase:** Fase 4: Calidad

## Objetivo

El código de `app/` se valida con ESLint y se formatea con Prettier mediante scripts de `bun`, y todo el código existente cumple.

## Contexto

Los paquetes `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-vue`, `eslint-config-prettier`, `globals` y `prettier` ya se añadieron al preparar el plan; esta tarea los configura. Se replica el estilo de `web/eslint.config.js` y `web/.prettierrc` (`singleQuote`). Lo ejecutan las tareas 009 y 010.

## Alcance

- Crear `app/eslint.config.js` (flat config): `globalIgnores(['dist/'])`, `js.configs.recommended` para JS, `tseslint.configs.recommended` para `ts`/`vue`, `vue.configs['flat/recommended-error']`, parser TS en `.vue`, globals de navegador en `src` y de Node en archivos de configuración, y `eslint-config-prettier` al final.
- Crear `app/.prettierrc` (`singleQuote: true`) y `app/.prettierignore` (`dist`, `bun.lock`).
- Scripts: `lint`, `lint:fix`, `format`, `format:check`.
- Ejecutar `bun run format` y corregir los avisos de lint.

## Criterios de aceptación

- [x] `bun run lint` y `bun run format:check` terminan en verde.
- [x] Introducir una variable sin usar en un `.ts` hace fallar `lint` (comprobación manual, revertida).
- [x] `bun run typecheck` y `bun run build` siguen en verde.

## Referencias

- `features/003-app-spa-vite-vue-primevue/spec.md`, sección "Fase 4" → tarea 008.
- `web/eslint.config.js`, `web/.prettierrc`.
- https://eslint.vuejs.org/user-guide/

## Fuera de alcance

- Hooks de git, CI y reglas de estilo adicionales.

## Notas de implementación

Configuración replicada de `web/`, sin el plugin de Astro. Prettier formateó todo el código incluyendo las vistas.
