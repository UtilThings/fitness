# 006 - [Config] ESLint y Prettier

- **Prioridad:** 6
- **Estado:** Completado
- **Depende de:** 001, 005
- **Fase:** Fase 3: Calidad

## Objetivo

Lint, formato y verificación de tipos automatizados con scripts de `bun`, y todo el código existente cumple las reglas.

## Contexto

Existe código Astro, Vue y TS (tareas 001-005). ESLint usa flat config (`eslint.config.js`). Verificar compatibilidad de versiones de `eslint`, `eslint-plugin-astro`, `eslint-plugin-vue` y `typescript-eslint` con `npm view` / `bun pm ls` tras instalar.

## Alcance

- Instalar con `bun add -d` `eslint`, `typescript-eslint`, `eslint-plugin-astro`, `eslint-plugin-vue`, `eslint-config-prettier`, `prettier`, `prettier-plugin-astro`, `@astrojs/check` y `typescript`.
- Crear `web/eslint.config.js`, `web/.prettierrc` (con plugin Astro) y `web/.prettierignore` (`dist`, `.astro`, `node_modules`, lockfile).
- Scripts en `package.json`: `lint`, `lint:fix`, `format`, `format:check`, `check` (`astro check`).
- Ejecutar `format` y corregir hallazgos de lint sobre el código existente.
- Límites: sin reglas personalizadas más allá de las recomendadas.

## Criterios de aceptación

- [x] `bun run lint` termina con código 0.
- [x] `bun run format:check` termina con código 0.
- [x] `bun run check` termina con 0 errores y 0 advertencias.
- [x] Introducir un error de lint temporal en un `.vue` y un `.astro` hace fallar `lint` (comprobado y revertido).
- [x] `bun run build` sigue en verde.

## Referencias

- `features/001-web-astro-vue-boilerplate/spec.md`, sección "Fase 3" → tarea 006.
- https://eslint.org/docs/latest/use/configure/configuration-files
- https://ota-meshi.github.io/eslint-plugin-astro/
- https://eslint.vuejs.org/user-guide/

## Fuera de alcance

- Hooks de git (husky/lint-staged) y CI.

## Notas de implementación

Confirmados los rangos de compatibilidad y la instalación con bun pm ls. Se mantuvo TypeScript 5.9 para conservar baseUrl sin avisos. Lint, formato, astro check (0 errores, avisos y sugerencias) y build pasaron. ESLint detectó variables sin usar en Vue y Astro; las comprobaciones temporales se retiraron.
