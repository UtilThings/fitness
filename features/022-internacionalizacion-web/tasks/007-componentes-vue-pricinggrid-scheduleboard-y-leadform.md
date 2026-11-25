# 007 - [Web] Componentes Vue: PricingGrid, ScheduleBoard y LeadForm

- **Prioridad:** 7
- **Estado:** Completado
- **Depende de:** 005, 006
- **Fase:** Fase 2: Shell y utilidades

## Objetivo

Las tres islas de contenido muestran todo su texto en el idioma activo, resuelven los descriptores del catálogo y usan los formateadores por idioma, y cambian en caliente.

## Contexto

- `PricingGrid.vue`: `Most popular`, `Updating…` (hoy `lang === 'es' ? 'Actualizando…' : 'Updating…'` inline), `cta` por defecto `Inquire now`, muestra `plan.unit/sessions/freq/note`, usa `formatPrice`.
- `ScheduleBoard.vue`: filtros `All`/`Group Strength`/`Tropical Jump` (la clave del objeto `filters` es también el valor `ServiceFilter`), `aria-label` («Filter by service», «Previous week», «Next week»), `spots`, estados (`status` → `full`/`almost`/`available`/`checkAvailability`), botones, `formatLocalTime`, `Intl` por `locale`.
- `LeadForm.vue`: recibe `fields`, `submitLabel`, `successMessage` por props desde las páginas (los textos se traducen en 010 al armar las props).
- Las islas hidratan en `en` y cambian en `onMounted`.

## Alcance

- `PricingGrid.vue`: `t()` para `Most popular`, `Updating…`; `cta` llega como clave y se traduce al renderizar (`t(cta)`); resolver `Text` con `resolveText`; `formatPrice` con locale activo. Eliminar el condicional `lang === 'es'`.
- `ScheduleBoard.vue`: mapa valor de filtro → clave con `tl()` para etiquetas; `aria-label` con `t()`; estados con `tl()`; hora con `formatTime(…, locale)`; conservar el valor de filtro como identificador (no el texto); nombres de servicio del API sin traducir (con `tr()` solo para los del respaldo).
- `LeadForm.vue`: resolver `placeholder`, `options`, `submitLabel`, `successMessage` y `title` mediante `t()` al renderizar (las props llevan claves inglesas); `aria-label` del select.
- Agregar claves a `es.json`; actualizar `PricingGrid.test.ts`, `ScheduleBoard.test.ts` y `LeadForm.test.ts` en `en` y añadir un caso en `es` por componente (cambio de idioma en caliente).
- Límites: no se migran páginas que usan estos componentes (008-010); las props `cta`, `submitLabel`, etc. se siguen pasando en inglés.

## Criterios de aceptación

- [x] `cd web && bun run lint`, `bun run check`, `bun run test` y `bun run build` pasan en verde.
- [x] `bun run i18n:check` en verde.
- [x] Con `en` el HTML renderizado (SSR) es idéntico al actual.
- [x] Con `es`: filtros, estados, botones, `aria-label`, plurales de cupos y mensajes de carga/error/vacío salen en español; cambiar el idioma no vuelve a pedir el catálogo ni la semana.
- [x] Nombres/notas de planes y nombres de entrenadores del API no se alteran.
- [x] El filtro seleccionado se conserva al cambiar de idioma.

## Referencias

- `features/022-internacionalizacion-web/spec.md`, «Fase 2» → tarea 007.
- `web/src/components/PricingGrid.vue`, `ScheduleBoard.vue`, `LeadForm.vue` y sus tests.

## Fuera de alcance

- Cambio de contenido de las páginas (008-010).

## Notas de implementación

Pasaron lint, astro check, 73 pruebas, build, dist e i18n:check. Las pruebas cubren los tres componentes en caliente, la selección estable del formulario y del filtro, una sola petición por datos y el contenido comercial intacto. Las páginas solo marcan las claves de props existentes para tiparlas y extraerlas, sin cambiar su redacción inglesa.
