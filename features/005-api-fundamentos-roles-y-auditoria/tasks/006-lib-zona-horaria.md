# 006 - [Lib] Helper puro de zona horaria America/New_York

- **Prioridad:** 6
- **Estado:** Completado
- **Depende de:** 003
- **Fase:** Fase 2

## Objetivo

La lógica de servidor puede convertir entre hora local del negocio y UTC con un helper puro y probado, sin depender de `Intl`.

## Contexto

Zona del negocio: `America/New_York` (Miramar, FL); las fechas se guardan en UTC. Las plantillas de clases guardan `start_time` en hora local y 009 genera sesiones en UTC; 011 compara ventanas de cancelación. Goja es un intérprete ES5+ de PocketBase; `Intl` no es fiable y los husos del sistema pueden ser UTC.

## Alcance

- Antes de codificar, verificar en `api/pb` (por ejemplo con un hook o ruta temporal que devuelva `typeof Intl`, `new Date().getTimezoneOffset()`, `Date.UTC(...)`, `toISOString()` y `new Date(iso).getUTCDay()`) y registrar el resultado en las notas de la tarea; retirar el código temporal.
- Crear `api/src/lib/tz.ts`: `nyOffsetMinutes(utcMs)` con la regla de EE. UU. (inicio: segundo domingo de marzo 02:00 hora local; fin: primer domingo de noviembre 02:00 hora local), `localToUtc(date: "YYYY-MM-DD", time: "HH:mm")` → ISO UTC, `utcToLocal(iso)` → `{ date, time, weekday }` (0 = domingo), `localWeekday(date)`, `addLocalDays(date, n)`, `startOfLocalDay(date)` → ISO UTC. Solo usa `Date.UTC` y métodos `getUTC*`.
- Hora inexistente (salto de marzo) se desplaza una hora hacia delante; hora ambigua (retroceso de noviembre) usa la primera ocurrencia (horario de verano). Documentarlo en comentarios.
- Crear `api/src/lib/tz.test.ts`: 2026 y 2027 (fechas de cambio), 02:30 del salto, 01:30 ambigua, medianoche, 29 de febrero de 2028, `weekday`, `addLocalDays` cruzando el cambio de horario.

## Criterios de aceptación

- [x] `bun test` pasa con los casos límite indicados.
- [x] Los resultados de verificación de goja están en las notas de la tarea.
- [x] `tz.ts` no referencia `Intl`, `toLocaleString` ni `getTimezoneOffset`.
- [x] `bun run build:ts` genera `pb_hooks/lib/tz.js` y se puede `require` dentro de un callback.

## Referencias

- `features/005-api-fundamentos-roles-y-auditoria/spec.md`, sección "Fase 2" → tarea 006.
- https://pocketbase.io/docs/js-overview/
- https://www.nist.gov/pml/time-and-frequency-division/popular-links/daylight-saving-time-dst

## Fuera de alcance

- Generación de sesiones y bloqueos (feature 009) y ventana de cancelación (feature 011).
- Conversión en la app (feature 006, `datetime.ts` con `Intl`).

## Notas de implementación


Sonda previa en api/pb 0.40.5 con el entorno America/Bogota: typeof Intl = undefined, getTimezoneOffset() = 300, Date.UTC(2026, 2, 8, 7) = 1772953200000, toISOString() = 2026-03-08T07:00:00.000Z y getUTCDay() = 0. Se verificó require desde otro callback temporal y pasaron las pruebas de los cambios de horario de 2026 y 2027. localWeekday acepta una fecha civil y un instante ISO UTC para cubrir los dos contratos descritos.
