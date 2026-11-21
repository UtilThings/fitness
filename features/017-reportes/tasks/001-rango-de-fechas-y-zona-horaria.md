# 001 - [Lib] Rango de fechas y zona horaria de reportes

- **Prioridad:** 1
- **Estado:** Pendiente
- **Depende de:** Feature 009 (contrato)
- **Fase:** Fase 1: Lógica pura de agregación

## Objetivo

Existe una librería pura que valida el rango `from`/`to` de los reportes y lo convierte a límites UTC y a claves de periodo en hora de `America/New_York`, incluidos los cambios de horario de verano.

## Contexto

Las fechas se guardan en UTC y el negocio opera en `America/New_York`. goja no ofrece `Intl` fiable, por lo que la conversión es manual. `api/src/lib/` solo contiene `utils.ts`; la feature 005 añade el script `test` (`bun test`) y 009 puede haber aportado un helper de zona horaria. Antes de escribir código: comprobar con una ruta temporal o con la documentación qué soporta goja de `Date` e `Intl`, y buscar en `api/src/lib/` si ya existe un helper de hora local para reutilizarlo (no duplicar).

## Alcance

- Crear `api/src/lib/reports-range.ts` con: `parseRange(from, to)` (valida formato `YYYY-MM-DD`, `to >= from`, máximo 366 días; lanza `ReportRangeError` con mensaje en español), `localDateToUtc(date)` (medianoche local a UTC con las reglas de EE. UU.: segundo domingo de marzo y primer domingo de noviembre a las 02:00), `utcToLocalParts(iso)` (año, mes, día, hora, minuto, día de semana locales) y `bucketKey(iso, groupBy)` para `day`, `week` (domingo como inicio, igual que `web/src/lib/schedule.ts`) y `month`; `listBuckets(range, groupBy)` para rellenar periodos vacíos.
- Importar `api/src/lib/tz.ts` (feature 005, ampliado en 009) y limitar este archivo a lo específico de reportes con la conversión y documentarlo en el encabezado.
- Pruebas `api/src/lib/reports-range.test.ts`: 2026-03-08 (día de 23 h), 2026-11-01 (día de 25 h), cambio de año, rango de un día, rango de 366 y 367 días, fechas inexistentes (`2026-02-30`), instante a las 23:30 local que cae al día siguiente en UTC.
- Sin rutas ni acceso a PocketBase.

## Criterios de aceptación

- [ ] `localDateToUtc('2026-03-08')` y `localDateToUtc('2026-03-09')` están separadas por 23 h; `2026-11-01` y `2026-11-02`, por 25 h.
- [ ] `parseRange` rechaza rangos invertidos, de más de 366 días y fechas mal formadas o inexistentes con `ReportRangeError`.
- [ ] `bucketKey` agrupa un pago de las 23:30 hora local en el día local correcto aunque en UTC sea el día siguiente.
- [ ] `listBuckets` devuelve todos los periodos del rango, sin huecos ni duplicados.
- [ ] `bun test` en `api/` pasa en verde.

## Referencias

- `features/017-reportes/spec.md`, sección "Fase 1" → tarea 001.
- `web/src/lib/schedule.ts` (semana iniciada en domingo).
- https://pocketbase.io/docs/js-overview/

## Fuera de alcance

- Agregaciones (002 y 003) y rutas (004).
- Formateo de fechas para la interfaz (`app/src/lib/datetime.ts`, 006).

## Notas de implementación

