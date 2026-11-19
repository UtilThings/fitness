# 007 - [Pruebas] Vitest y Vue Test Utils

- **Prioridad:** 7
- **Estado:** Pendiente
- **Depende de:** 002, 004, 005
- **Fase:** Fase 3: Calidad

## Objetivo

Hay un runner de pruebas configurado y pruebas verdes para el componente de ejemplo y para la validación de entorno.

## Contexto

Se usa `getViteConfig` de `astro/config` para heredar plugins (Vue) y alias. Verificar la guía de testing de Astro y la compatibilidad de `vitest` con la versión de Node antes de instalar (vitest 5.1.x acepta Node 22.12+/24).

## Alcance

- Instalar con `bun add -d` `vitest`, `@vue/test-utils` y `happy-dom`.
- Crear `web/vitest.config.ts` con `getViteConfig({ test: { environment: 'happy-dom', include: ['src/**/*.test.ts'] } })`.
- Crear `web/src/components/Counter.test.ts`: renderiza con valor inicial, incrementa tras `click`, respeta la prop `initial`.
- Crear `web/src/lib/env.test.ts`: `parseEnv` correcto, variable obligatoria ausente (el mensaje nombra la variable), URL inválida.
- Scripts: `test` (`vitest run`) y `test:watch`. Se ejecutan siempre con `bun run test` (no `bun test`, que usaría el runner de Bun en lugar de Vitest).
- Límites: sin pruebas e2e ni cobertura mínima.

## Criterios de aceptación

- [ ] `bun run test` (no `bun test`) termina en verde con todas las pruebas anteriores.
- [ ] Una prueba falla si se rompe el incremento del contador (comprobado y revertido).
- [ ] Las pruebas usan el alias `@/`.
- [ ] `bun run lint`, `bun run check` y `bun run build` siguen en verde (los archivos de prueba cumplen lint y tipos).

## Referencias

- `features/001-web-astro-vue-boilerplate/spec.md`, sección "Fase 3" → tarea 007.
- https://docs.astro.build/en/guides/testing/
- https://test-utils.vuejs.org/guide/

## Fuera de alcance

- Pruebas e2e (Playwright) y CI.

## Notas de implementación

<!-- Se completa al terminar la tarea. -->
