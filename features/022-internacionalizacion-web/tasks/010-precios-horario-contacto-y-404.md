# 010 - [Web] Precios, horario, contacto y 404

- **Prioridad:** 10
- **Estado:** Completado
- **Depende de:** 006, 007, 008
- **Fase:** Fase 3: Migración de páginas

## Objetivo

Las páginas restantes (`/pricing`, `/schedule`, `/contact` y `404`) están en inglés con traducción al español, sin cambiar el HTML en inglés.

## Contexto

- `pricing.astro`: `sections` con `title`, `cta` (`Inquire now`/`Book now`) y `to`; hero; `title`/`description`.
- `schedule.astro`: hero (`Find your class.`), eyebrow ya con `<T k="schedule">`, `ScheduleBoard` (migrado en 007).
- `contact.astro`: hero, tarjetas `Location`/`Programs` (lista de programas con `·`), `LeadForm` con `fields` (placeholders y opciones: `Full name`, `Email`, `Program`, opciones, `Message`), `submitLabel`, `successMessage`.
- `404.astro`: `Page not found`, descripción, `Go home`; usa `BaseLayout` con `bare`.
- La lista de programas se repite como opciones del select y como texto: reutilizar las mismas claves de navegación (`Personal Training`, `Group Strength`, `Tropical Jump`, `Online Coaching`).

## Alcance

- Migrar el texto de las cuatro páginas con el patrón de 008; `cta` de `pricing.astro` y `LeadForm` con claves que traduce la isla (007).
- `404.astro`: `<title>`, `h2`, descripción y botón traducibles (la página es `bare`, sin Header: el script cliente igualmente resuelve el idioma guardado).
- Reutilizar claves existentes siempre que el texto inglés coincida (sin duplicados en `es.json`).
- Agregar claves a `es.json`; `bun run i18n:sort`.

## Criterios de aceptación

- [x] `cd web && bun run lint`, `bun run check`, `bun run test`, `bun run build` y `bun run test:dist` pasan en verde.
- [x] `bun run i18n:check` en verde.
- [x] En `en` las páginas equivalen al HTML actual; en `es`, todo el texto visible, `title` y formulario salen en español.
- [x] `404.html` respeta el idioma guardado aunque no tenga cabecera.

## Referencias

- `features/022-internacionalizacion-web/spec.md`, «Fase 3» → tarea 010.
- `web/src/pages/pricing.astro`, `schedule.astro`, `contact.astro`, `404.astro`.

## Fuera de alcance

- Enviar el formulario al API.

## Notas de implementación

Pasaron lint, astro check, pruebas, build, dist e i18n:check. Precios, Horario, Contacto y 404 conservan texto, títulos y alt en inglés. Chromium verificó títulos y formulario en español y la ruta inexistente con estado HTTP 404, sin cabecera y con el idioma guardado.
