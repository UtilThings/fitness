# 008 - [Vista] `/reports` con pestañas, permisos y exportación

- **Prioridad:** 8
- **Estado:** Completado
- **Depende de:** 005, 006, 007, Feature 006 (contrato)
- **Fase:** Fase 4: Interfaz

## Objetivo

El staff abre `/reports`, ve pestañas con gráficos y detalle, filtra por rango y servicio y exporta a CSV; los coaches no ven la pestaña de ingresos.

## Contexto

Las vistas viven en `app/src/views/admin/*View.vue`, las rutas protegidas son hijas de `AdminLayout` con `meta.requiresAuth` y `meta.title`, y la navegación está solo en `app/src/layouts/admin-nav.ts` (006 la deja sin badges falsos). El rol del admin autenticado viene del registro de `admins` (`owner|coach|reception`); si 006 aporta un composable de permisos, reutilizarlo. La API (004) ya aplica el `403` en `revenue`; la UI solo oculta.

## Alcance

- Crear `app/src/views/admin/ReportsView.vue` con `Tabs` de PrimeVue (Ocupación, Asistencia, Ingresos, Retención), `DatePicker` en modo rango, botones de preset, `Select` de servicio, tarjetas de totales, `ReportChart` y `DataTable` de detalle; textos en español, importes con formato USD y fechas en hora de Miramar, FL.
- Pestaña Ingresos solo para `owner`; si otro rol fuerza `?tab=revenue`, mostrar aviso y no llamar a la API.
- Botón «Exportar CSV» por pestaña: columnas visibles → `toCsv` → `downloadCsv(csvFilename(...))`; deshabilitado si no hay datos o está cargando.
- Estados de carga, vacío y error por pestaña; la pestaña activa se refleja en `?tab=`.
- `app/src/router/index.ts`: ruta `reports` (`/reports`) hija de `AdminLayout` con `meta.requiresAuth` y `meta.title = 'Reportes'` (carga diferida de la vista). `admin-nav.ts`: entrada real «Reportes» (`pi pi-chart-bar`, grupo Análisis), retirando el marcador que la sustituya.
- Pruebas Vitest: pestañas visibles para owner (4) y coach (3), cambio de rango dispara `load`, exportación llama a `downloadCsv` con las columnas esperadas, aviso por URL forzada, `router/index.test.ts` y `admin-nav.test.ts` actualizados.

## Criterios de aceptación

- [x] `/reports` sin sesión redirige a `/login?redirect=%2Freports`.
- [x] Owner ve cuatro pestañas; coach ve Ocupación, Asistencia y Retención.
- [x] Un coach con `?tab=revenue` ve el aviso y no se hace ninguna petición a `/api/admin/reports/revenue`.
- [x] «Exportar CSV» descarga un archivo con BOM cuyo contenido coincide con la tabla mostrada.
- [x] Cambiar el rango o el servicio recarga los datos y actualiza gráficos, tarjetas y tabla.
- [x] La entrada «Reportes» aparece en la navegación y resalta la ruta activa.
- [x] `bun run test`, `lint`, `format:check`, `typecheck` y `build` en `app/` pasan.

## Referencias

- `features/017-reportes/spec.md`, sección "Fase 4" → tarea 008.
- `app/src/layouts/admin-nav.ts`, `app/src/router/index.ts`.
- https://primevue.org/tabs/
- https://primevue.org/datatable/

## Fuera de alcance

- Cambios en la API (004).
- Reportes programados, PDF y comparación entre periodos.

## Notas de implementación

Reportes usa la sesión y el resaltado de AdminLayout. El CSV usa las columnas de la agrupación seleccionada y todas sus filas. Se verificaron los roles, la URL forzada, los filtros, la exportación y el manifiesto del build: ReportsView importa de forma diferida PrimeVue Chart, que a su vez importa Chart.js. verify-app.sh pasó con 302 pruebas.
