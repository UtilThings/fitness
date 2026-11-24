# 006 - [Componente] Horario y disponibilidad real en `ScheduleBoard`

- **Prioridad:** 6
- **Estado:** Completado
- **Depende de:** 004
- **Fase:** Fase 3: Componentes y páginas

## Objetivo

`/schedule` muestra las clases y los cupos reales de cada semana desde la API, con estados de carga y error y sin cupos simulados.

## Contexto

`ScheduleBoard.vue` (`client:only="vue"`) calcula la semana en el navegador, usa `classesForDay` sobre `classTemplates` y `spotsLeft` de `schedule.ts` (cupos simulados con una función seno) y `availability` de `data.ts`. `i18n.ts` aporta textos es/en vía `useLang`. La API entrega `local_date`, `local_time` (`HH:mm`), `capacity`, `spots_left` y `status` por sesión para una semana iniciada en domingo.

## Alcance

- Modificar `web/src/components/ScheduleBoard.vue`: la semana se calcula en hora de `America/New_York` (no la del navegador) y se pide con `fetchSchedule(week)`; agrupa por `local_date`, filtra por servicio, muestra `spots_left / capacity` y el estado de la API; navegación entre semanas con límite inferior en la semana actual y superior en el máximo permitido; cancela la petición anterior al cambiar de semana.
- Estados: cargando (esqueleto), error con botón «Reintentar», semana sin clases, y modo respaldo.
- Respaldo: si la API falla, mostrar las clases de `classTemplates` **sin cupos** con el texto «Consulta disponibilidad» y un aviso; el botón enlaza a `/contact` como hoy (sin integrar formularios).
- Eliminar `spotsLeft` de `web/src/lib/schedule.ts` y sus pruebas; conservar `weekStart`, `weekDays`, `formatRange`, `classesForDay` (respaldo).
- `web/src/lib/i18n.ts`: claves nuevas es/en (`loading`, `loadError`, `retry`, `noClasses`, `checkAvailability`, `fallbackNotice`).
- Pruebas Vitest actualizadas de `ScheduleBoard.test.ts` y `schedule.test.ts` con `fetch` simulado y reloj fijo.

## Criterios de aceptación

- [x] La semana mostrada y las fechas de las tarjetas coinciden con la hora de Miramar, FL aunque el navegador esté en otra zona.
- [x] Los cupos y el estado de cada tarjeta provienen de la API; `full` muestra «Join waitlist» y mantiene el enlace a `/contact`.
- [x] Cambiar de semana pide la semana nueva y descarta la respuesta anterior si llega tarde.
- [x] Con la API caída se ven las clases base sin números de cupos y con el aviso; no queda código de cupos simulados.
- [x] Los textos nuevos existen en español e inglés.
- [x] `bun run lint`, `format:check`, `check` y `test` en `web/` pasan.

## Referencias

- `features/019-catalogo-publico-en-web/spec.md`, sección "Fase 3" → tarea 006.
- `web/src/components/ScheduleBoard.vue`, `web/src/lib/schedule.ts`, `web/src/lib/i18n.ts`.

## Fuera de alcance

- Reservas y lista de espera reales desde el sitio (la acción sigue enlazando a contacto).
- Precios y planes (005).

## Notas de implementación

- Calendario y tarjetas usan fechas civiles de Miramar. El navegador lee el máximo configurado en X-Public-Schedule-Max-Weeks y usa ocho semanas mientras no recibe el encabezado. Pasaron 58 pruebas de web con TZ=Pacific/Auckland y el verificador de PocketBase.
