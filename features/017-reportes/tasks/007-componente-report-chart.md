# 007 - [Componente] `ReportChart` con PrimeVue Chart

- **Prioridad:** 7
- **Estado:** Completado
- **Depende de:** Feature 006 (contrato)
- **Fase:** Fase 4: Interfaz

## Objetivo

Un componente reutilizable pinta barras, líneas y anillos con el tema de PrimeVue y carga la librería de gráficos solo cuando se necesita.

## Contexto

`app/` usa PrimeVue 5 (Aura, primario esmeralda) y no tiene `chart.js`. La decisión de librería está justificada en el spec (componente `Chart` de PrimeVue sobre Chart.js 4). El componente `primevue/chart` importa `chart.js/auto` de forma dinámica. Comprobar antes de usarlo, en `node_modules/primevue/chart`, que existe en PrimeVue 5 y sus props (`type`, `data`, `options`).

## Alcance

- Añadir `chart.js` a `app/package.json` (`bun add chart.js`) y actualizar `bun.lock`.
- Crear `app/src/components/reports/ReportChart.vue` con props `type` (`bar|line|doughnut`), `labels`, `datasets`, `ariaLabel`, `loading`, `valueFormat` (`number|percent|money`); carga diferida con `defineAsyncComponent(() => import('primevue/chart'))`; estado de carga y estado vacío («Sin datos en el rango»).
- Crear `app/src/components/reports/chart-data.ts` con `buildChartData(...)` y `buildChartOptions(...)` (puras): colores desde variables CSS de PrimeVue (`--p-primary-*`, `--p-surface-*`) resueltas con `getComputedStyle` en cliente, rejilla y texto adaptados al modo oscuro, tooltips con `valueFormat` (dinero en USD desde centavos), `responsive` y `maintainAspectRatio: false`.
- Pruebas Vitest: `buildChartData` (series y etiquetas, dinero a dólares, porcentaje), estado vacío, estado de carga y presencia de `aria-label` (el canvas se simula; no se renderiza Chart.js real).
- Sin vistas ni rutas.

## Criterios de aceptación

- [x] `chart.js` aparece en `package.json` y el `build` genera un chunk separado cargado solo desde la vista de reportes.
- [x] Con `labels = []` el componente muestra el estado vacío y no monta el gráfico.
- [x] `buildChartData` convierte 26800 centavos a 268 en dinero y 0.8333 a 83,3 en porcentaje.
- [x] El contenedor del gráfico tiene `role="img"` y `aria-label`.
- [x] `bun run test`, `lint`, `format:check`, `typecheck` y `build` en `app/` pasan.

## Referencias

- `features/017-reportes/spec.md`, sección "Fase 4" → tarea 007, y "Decisiones".
- https://primevue.org/chart/
- https://www.chartjs.org/docs/latest/

## Fuera de alcance

- Vista y pestañas (008).
- Otras librerías de gráficos.

## Notas de implementación

Chart.js 4 se importa a través de PrimeVue. El manifiesto de una compilación con entrada de prueba confirmó los chunks dinámicos de ReportChart, PrimeVue Chart y chart.js/auto. verify-app.sh pasó completo. La importación desde la ruta real corresponde a la tarea 008.
