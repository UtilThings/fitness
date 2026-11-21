# 001 - [Lib] Lógica pura del catálogo y horario públicos

- **Prioridad:** 1
- **Estado:** Pendiente
- **Depende de:** Feature 008 (contrato), Feature 009 (contrato), Feature 011 (contrato)
- **Fase:** Fase 1: API pública

## Objetivo

Existe una librería pura y probada que construye las respuestas públicas de catálogo y horario por whitelist de campos, calcula el estado de disponibilidad y normaliza el parámetro `week`.

## Contexto

Las librerías puras viven en `api/src/lib/*.ts` y se prueban con `bun test` (script añadido por 005); las rutas (tarea 002) las cargan con ``require(`${__hooks}/lib/public-catalog`)`` dentro de cada callback. El contrato de respuesta está en el spec. `availability` de `web/src/lib/data.ts` define los umbrales (0 → `full`, 1-2 → `almost`, >2 → `available`). La hora local usa el helper de 009 (o `business-time.ts` de 017 si existe); goja no tiene `Intl` fiable.

## Alcance

- Crear `api/src/lib/public-catalog.ts` con `availabilityStatus(spotsLeft)`, `normalizeWeek(input, today, maxWeeks)` (devuelve el domingo local `YYYY-MM-DD`; semanas pasadas → semana actual; más allá de `maxWeeks` o fecha inexistente → error tipado `PublicQueryError`), `buildCatalog(services, plans, templates, coaches)` y `buildSchedule(weekStart, sessions, bookingCounts, services, coaches)`.
- Whitelist estricta: solo los campos del contrato; ningún id, correo ni dato interno se copia. Solo servicios y planes `active`, ordenados por `sort`; sesiones `scheduled` de `kind` `regular` o `special`; `spots_left = max(0, capacity - ocupadas)` con ocupadas = reservas `booked`, `attended` y `no_show`.
- Pruebas `public-catalog.test.ts`: sesión privada y cancelada excluidas, plan y servicio inactivos excluidos, `spots_left` nunca negativo, umbrales 0/1/2/3, `week` en domingo, sábado y fin de año, `2026-02-30` inválido, límite de semanas, prueba de «forma exacta» (las claves de cada objeto son exactamente las del contrato), sesiones en los días de cambio de horario (2026-03-08, 2026-11-01).
- Sin consultas a PocketBase ni rutas.

## Criterios de aceptación

- [ ] `normalizeWeek('2026-11-19', today)` devuelve `2026-11-15` y una fecha pasada devuelve la semana actual.
- [ ] Fechas inválidas o fuera del máximo de semanas lanzan `PublicQueryError`.
- [ ] Ningún objeto de la salida contiene claves fuera del contrato, aunque la entrada traiga campos extra (`client`, `email`, `notes`).
- [ ] `availabilityStatus` coincide con `availability` de `web/src/lib/data.ts` para -1, 0, 1, 2 y 3.
- [ ] `bun test` en `api/` pasa en verde.

## Referencias

- `features/019-catalogo-publico-en-web/spec.md`, sección "Fase 1" → tarea 001, y "Contrato HTTP".
- `web/src/lib/data.ts` (`availability`), `web/src/lib/schedule.ts` (`weekStart`).

## Fuera de alcance

- Rutas, caché y CORS (002).
- Cliente de `web/` (004).

## Notas de implementación

