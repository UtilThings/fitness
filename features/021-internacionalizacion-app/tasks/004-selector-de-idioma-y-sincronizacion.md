# 004 - [Módulo] Selector de idioma y sincronización (html, título, PrimeVue)

- **Prioridad:** 4
- **Estado:** Completado
- **Depende de:** 002, 003
- **Fase:** Fase 1: Fundamentos

## Objetivo

El usuario cambia el idioma desde la interfaz y el cambio es inmediato, persistente y coherente con `<html lang>`, el título del documento y los textos internos de PrimeVue.

## Contexto

`AdminLayout.vue` y `AuthLayout.vue` son los marcos de las vistas. `router/index.ts` declara `meta.title` y `App.vue` monta el router. PrimeVue 5 acepta `locale` en `app.use(PrimeVue, { locale })` y se puede actualizar en caliente con `usePrimeVue().config.locale`.

## Alcance

- Crear `app/src/components/LocaleSwitcher.vue` (PrimeVue `Select` o `SelectButton`, etiquetas «English»/«Español» sin traducir) y ubicarlo en el menú de usuario de `AdminLayout` y en `AuthLayout`.
- Crear `app/src/i18n/primevue.ts` con los textos de PrimeVue en español (`es`) y en inglés (los de PrimeVue por defecto); aplicarlos en `setLocale`.
- `setLocale` sincroniza `document.documentElement.lang` y `localStorage`; un `watch` en `App.vue` actualiza `document.title` con `t(route.meta.title)` + nombre del negocio.
- Pruebas: `LocaleSwitcher.test.ts` y comprobación de `lang`/título tras cambiar el idioma.
- No traduce el resto del texto de los layouts (008).

## Criterios de aceptación

- [x] `cd app && bun run lint`, `bun run typecheck` y `bun run test` pasan en verde.
- [x] Cambiar el idioma actualiza `<html lang>` y `localStorage` sin recargar.
- [x] Un `DatePicker`/diálogo de confirmación de PrimeVue muestra nombres de mes y botones del idioma activo.
- [x] El selector aparece en la pantalla de acceso y en el admin.

## Referencias

- https://primevue.org/configuration/#locale

## Fuera de alcance

- Traducción de textos de layouts y títulos de ruta (008).

## Notas de implementación

Lint, comprobación de tipos y 336 pruebas en verde. El selector de acceso se probó con DatePicker y el locale de confirmación. El cambio actualiza el título, el atributo lang y la preferencia. El menú de usuario del admin utiliza el mismo selector.
