# 019 - [Web] Página `/schedule`

- **Prioridad:** 19
- **Estado:** Completado
- **Depende de:** 006, 007, 018
- **Fase:** Fase 4: Páginas interactivas

## Objetivo

`/schedule` replica el original: hero y calendario semanal interactivo.

## Contexto

Referencia: `reference/html/schedule.html`. Título `Class Schedule | JQ Fitness`; descripción `See upcoming Group Strength and Tropical Jump classes and remaining spots this week.` El calendario depende de la fecha actual, por lo que se monta con `client:only="vue"` (sin prerenderizado) para evitar desajustes de hidratación. El hero muestra el eyebrow con la clave `schedule` del diccionario (`Schedule` / `Horario`).

## Alcance

Crear `web/src/pages/schedule.astro`:

- `PageHero`: eyebrow `<T k="schedule" />`, título `Find your class.`, subtítulo `Pick a day, check the open spots, and reserve. Online booking with accounts is coming soon.`
- `Section` con clase `!pt-0` que monta `<ScheduleBoard client:only="vue" />`. Para evitar un salto de layout antes de la hidratación, reservar altura mínima en el contenedor (p. ej. `min-h-[24rem]`).
- Sin `CtaBand` (el original no la tiene en esta página).

## Criterios de aceptación

- [x] `dist/schedule/index.html` contiene el h1 `Find your class.` y el subtítulo, y no contiene tarjetas de clases (se renderizan en el cliente).
- [x] En `bun run preview`, el calendario muestra la semana actual, los filtros y los botones de semana funcionan y no aparecen errores de hidratación en la consola.
- [x] Los botones `Reserve` / `Join waitlist` llevan a `/contact`.
- [x] A 390 px las tarjetas son 1 columna y la cabecera de cada día queda sobre sus tarjetas; a 1440 px son 3 columnas con la fecha a la izquierda (140 px).
- [x] `bun run lint`, `bun run format:check`, `bun run check`, `bun run test` y `bun run build` pasan en verde.

## Referencias

- `features/002-web-replica-lovable/spec.md`, "Fase 4" → tarea 019.
- https://docs.astro.build/en/reference/directives-reference/#clientonly

## Fuera de alcance

- Reserva con cuentas ("coming soon" en el texto original).

## Notas de implementación

Chromium comprobó la semana actual, el filtro, los enlaces, la ausencia de errores de hidratación y el diseño a 390 px y 1440 px.
