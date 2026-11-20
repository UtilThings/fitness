# 004 - [Config] PrimeVue, tema Aura y tailwindcss-primeui

- **Prioridad:** 4
- **Estado:** Completado
- **Depende de:** 002, 003
- **Fase:** Fase 2: Integraciones

## Objetivo

Los componentes de PrimeVue se renderizan con el tema Aura y conviven con las utilidades de Tailwind, que pueden sobrescribirlos sin `!important`.

## Contexto

Versión vigente: `primevue` 5.0.x con `@primeuix/themes` 3.1.x. Antes de configurar, comprobar en `node_modules` y en https://primevue.org/vite/ que siguen vigentes `primevue/config`, `@primeuix/themes/aura` y la ruta de cada componente (`primevue/button`). `tailwindcss-primeui` 0.6.x expone su CSS para Tailwind v4 mediante `@import "tailwindcss-primeui";`.

## Alcance

- Instalar `primevue`, `@primeuix/themes`, `primeicons` y `tailwindcss-primeui`.
- En `main.ts`: `app.use(PrimeVue, { theme: { preset: Aura, options: { darkModeSelector: '.app-dark', cssLayer: { name: 'primevue', order: 'theme, base, primevue' } } } })`; importar `primeicons/primeicons.css`.
- En `main.css`: `@import "tailwindcss";`, `@import "tailwindcss-primeui";` y `@custom-variant dark (&:where(.app-dark, .app-dark *));`.
- Mostrar en `App.vue` (temporal, se reemplaza en la tarea 007) un `Button` con icono `pi pi-check` y una clase `bg-primary` de `tailwindcss-primeui`.

## Criterios de aceptación

- [x] El `Button` se ve con estilos de Aura en `bun run dev`.
- [x] La clase `bg-primary` (o `text-primary`) genera CSS en el build.
- [x] Añadir la clase `app-dark` a `<html>` activa el modo oscuro de PrimeVue.
- [x] `bun run typecheck` y `bun run build` pasan.

## Referencias

- `features/003-app-spa-vite-vue-primevue/spec.md`, sección "Fase 2" → tarea 004.
- https://primevue.org/vite/
- https://primevue.org/theming/styled/
- https://primevue.org/tailwind/

## Fuera de alcance

- Auto-import de componentes y temas personalizados (preset propio).

## Notas de implementación

API vigente comprobada: `primevue/config`, `@primeuix/themes/aura`, `primevue/button`. No se dejó contenido temporal en `App.vue`: la integración se verifica en las vistas de la tarea 007 (`Card`, `InputText`, `Password`, `Button`, `text-primary`). El CSS compilado contiene `text-primary` y la variante `app-dark`.
