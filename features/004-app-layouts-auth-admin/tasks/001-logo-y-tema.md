# 001 - [Config] Logo y tema de PrimeVue

- **Prioridad:** 1
- **Estado:** Completado
- **Depende de:** Feature 003
- **Fase:** Fase 1

## Objetivo

El logo de JQ Fitness está disponible en `app/` y la app usa el color primario esmeralda y un fondo claro de superficie.

## Contexto

El logo está en `web/src/assets/jq-logo.png` y el favicon en `web/public/favicon.png`. `app/` usa el preset `Aura` sin personalizar y `public/favicon.svg` provisional.

## Alcance

- Copiar `jq-logo.png` a `app/src/assets/` y `favicon.png` a `app/public/`; enlazar el PNG en `index.html` y eliminar `favicon.svg`.
- Crear `src/lib/theme.ts` con `definePreset(Aura, { semantic: { primary: { 50..950 → var(--p-emerald-*) } } })` y usarlo en `main.ts`.
- En `main.css`: `body` con `bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-surface-0` (con `@layer base`).
- Los botones y enlaces primarios deben verse esmeralda.

## Criterios de aceptación

- [x] El logo se importa desde `@/assets/jq-logo.png` sin errores de tipos.
- [x] Un `Button` por defecto se ve esmeralda; el fondo de la página es `surface-50`.
- [x] `bun run typecheck`, `lint`, `format:check` y `build` pasan.

## Referencias

- `features/004-app-layouts-auth-admin/spec.md`, sección "Fase 1" → tarea 001.
- https://primevue.org/theming/styled/#definepreset

## Fuera de alcance

- Layouts (003 y 005) y vistas (004).

## Notas de implementación

Logo y favicon copiados desde `web/`. `src/lib/theme.ts` usa `definePreset(Aura, ...)` con primario `{emerald.N}`. Se retiró `favicon.svg`. Hallazgo: PrimeVue 5 requiere clave de licencia; se añadió `VITE_PRIMEVUE_LICENSE` opcional (`src/lib/env.ts`, `.env.example`, `main.ts` → opción `license`).
