# 003 - [Web] AuthLayout

- **Prioridad:** 3
- **Estado:** Completado
- **Depende de:** 001, 002
- **Fase:** Fase 2

## Objetivo

Las pantallas de autenticación comparten un layout con tarjeta centrada y logo, similar a la referencia.

## Contexto

`AuthLayout` es provisional (tarea 002) y el logo y el tema existen (001). Referencia: tarjeta blanca redondeada con sombra suave sobre fondo claro, logo centrado, título en negrita, subtítulo gris, campo, botón verde de ancho completo y enlace inferior.

## Alcance

- Implementar `src/layouts/AuthLayout.vue`: `<main>` `min-h-screen` centrado con padding; tarjeta `w-full max-w-md rounded-2xl border border-surface-200 bg-surface-0 p-8 shadow-lg` (variantes `dark:`); logo `h-14` centrado con `alt`; `<RouterView />`.
- Crear `src/components/AuthHeading.vue` con props `title` y `subtitle?` (h1 centrado `text-2xl font-bold`, p gris).

## Criterios de aceptación

- [x] La tarjeta queda centrada en escritorio y ocupa el ancho disponible (máx. 28rem) en móvil.
- [x] `AuthHeading` renderiza título y, si se da, subtítulo.
- [x] `bun run typecheck`, `lint` y `format:check` pasan.

## Referencias

- `features/004-app-layouts-auth-admin/spec.md`, sección "Fase 2" → tarea 003.
- Capturas de referencia aportadas por el usuario.

## Fuera de alcance

- Contenido de los formularios (004).

## Notas de implementación

Logo `h-14`, tarjeta `max-w-md rounded-2xl` con sombra. Verificado con capturas en escritorio y móvil (390 px).
