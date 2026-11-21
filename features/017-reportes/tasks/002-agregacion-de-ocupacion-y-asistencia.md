# 002 - [Lib] Agregación de ocupación y asistencia

- **Prioridad:** 2
- **Estado:** Pendiente
- **Depende de:** 001, Feature 011 (contrato)
- **Fase:** Fase 1: Lógica pura de agregación

## Objetivo

Existen funciones puras y probadas que calculan la ocupación por clase y por servicio, y la asistencia con la tasa de no-show, a partir de sesiones y reservas ya cargadas.

## Contexto

`class_sessions` (009) y `bookings` (011) siguen el contrato: reservas con estados `booked`, `waitlisted`, `cancelled`, `late_cancelled`, `attended`, `no_show`. Las definiciones de tasas están fijadas en el spec (sección Contrato HTTP). La lógica no debe tocar PocketBase: recibe objetos planos y devuelve el cuerpo JSON del contrato.

## Alcance

- Crear `api/src/lib/reports-attendance.ts` con `aggregateOccupancy(sessions, bookings, { service? })` y `aggregateAttendance(sessions, bookings, { service?, groupBy })`.
- Ocupación: excluye sesiones `cancelled`; `booked` cuenta reservas en `booked`, `attended` y `no_show`; `waitlisted` por separado; totales y `by_service` ordenados por nombre; `by_class` ordenado por `starts_at`; tasas redondeadas a 4 decimales; `capacity = 0` produce tasa 0.
- Asistencia: totales por estado, `no_show_rate = no_show / (attended + no_show)`, `attendance_rate` análoga, `by_service` y `by_day` (hora local con `bucketKey`); `late_cancelled` y `cancelled` se informan pero no entran en el denominador.
- Pruebas `reports-attendance.test.ts`: sin sesiones, sesión sin reservas, sesión llena con lista de espera, sesión cancelada excluida, reservas de otro servicio con filtro, denominador 0, suma de `by_service` = totales, agrupación por día en frontera de medianoche local.
- Sin consultas ni rutas.

## Criterios de aceptación

- [ ] Para una sesión de capacidad 6 con 5 reservas `booked` y 1 `waitlisted`, `occupancy_rate` es 0,8333 y `waitlisted` es 1.
- [ ] Una sesión `cancelled` no aparece en totales ni en `by_class`.
- [ ] Con 0 asistidos y 0 no-show, `no_show_rate` y `attendance_rate` son 0, nunca `NaN`.
- [ ] La suma de `by_service` coincide con `totals` en todos los casos de prueba.
- [ ] `bun test` en `api/` pasa en verde.

## Referencias

- `features/017-reportes/spec.md`, sección "Fase 1" → tarea 002, y sección "Contrato HTTP".
- `api/src/lib/reports-range.ts` (tarea 001).

## Fuera de alcance

- Ingresos y retención (003).
- Carga de datos y permisos (004).

## Notas de implementación

