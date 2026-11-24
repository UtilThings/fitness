# 009 - [Módulo] Zona horaria por business en `tz.ts`

- **Prioridad:** 9
- **Estado:** Pendiente
- **Depende de:** 001
- **Fase:** Fase 2: Zona horaria, moneda y mensajes por business

## Objetivo

Las funciones de fecha local reciben la zona horaria y funcionan para cualquier zona IANA soportada, incluido el horario de verano.

## Contexto

`api/src/lib/tz.ts` exporta `nyOffsetMinutes`, `localToUtc`, `utcToLocal`, `localWeekday`, `addLocalDays`, `startOfLocalDay` y `localDateToUtcRange` con reglas fijas de Nueva York; 20 módulos las usan. La tarea 001 decide si goja soporta `Intl.DateTimeFormat` con `timeZone`; si no, se implementan reglas propias (EE. UU., UE y zonas sin horario de verano usadas por las monedas del spec).

## Alcance

- Reescribir `tz.ts` con parámetro `tz` (último argumento, valor por defecto `DEFAULT_TIMEZONE = 'America/New_York'` solo durante la migración; la tarea 011 lo elimina).
- Mantener un listado de zonas permitidas (`SUPPORTED_TIMEZONES`) usado también por la validación de `businesses.timezone` (002).
- Pruebas `tz.test.ts` ampliadas: Nueva York (regresión de las pruebas actuales), una zona de UE con DST, una zona sin DST (p. ej. `America/Bogota`), medianoche en días de 23 y 25 horas, horas inexistentes y repetidas en la transición.
- Sin cambios de comportamiento para llamadas existentes.

## Criterios de aceptación

- [ ] Todas las pruebas actuales de `tz.test.ts` siguen pasando sin modificar sus valores esperados.
- [ ] Hay pruebas de DST para al menos tres zonas distintas.
- [ ] Una zona no soportada lanza un error claro y `businesses` la rechaza (002).
- [ ] `bun run build:ts` y `bun test` pasan en verde.

## Fuera de alcance

- Propagar la zona a los consumidores (010, 011).

## Referencias

- `features/020-multi-tenancy-business/spec.md`, sección "Fase 2: Zona horaria, moneda y mensajes por business" → tarea 009.
- `api/src/lib/tz.ts`, `api/src/lib/tz.test.ts`

## Notas de implementación

<!-- Vacío al crear la tarea. Al completarla, registra archivos creados/modificados, decisiones, desviaciones y hallazgos pendientes. -->
