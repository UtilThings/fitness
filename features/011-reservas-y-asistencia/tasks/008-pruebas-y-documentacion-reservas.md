# 008 - [Pruebas] Pruebas de interfaz y documentación de reservas

- **Prioridad:** 8
- **Estado:** Pendiente
- **Depende de:** 001, 002, 003, 004, 005, 006, 007
- **Fase:** Fase 4: Verificación y cierre

## Objetivo

Los flujos de interfaz tienen pruebas y las transiciones y eventos de `bookings` quedan documentados para 013, 015 y 018.

## Contexto

La lógica pura ya está cubierta en la tarea 002; aquí se cubren componentes y vistas con Vitest y se documenta el contrato de transiciones que consumen otras features.

## Alcance

- Pruebas Vitest: `BookingDialog` (espera, clase gratis solo si elegible), `CancelBookingDialog` (nota solo en excepción), `SessionRoster` (asistencia deshabilitada antes del inicio), sección «Reservas» en `history-sections`, `AvailabilityTag` (tres estados).
- `api/README.md`: colección `bookings`, máquina de estados, tabla de eventos de `classifyTransition`, endpoint de disponibilidad y cómo engancharse desde 013.
- `app/README.md`: componentes de reservas y puntos de integración en 009 y 010.
- Documentar en el README la restitución automática de la clase gratis: cuándo se restituye (cancelación a tiempo, desde la espera, excepción del admin, sesión cancelada) y cuándo no (`late_cancelled`, `no_show`, `attended`), y que el owner conserva el restablecimiento manual (010).

## Criterios de aceptación

- [ ] Las pruebas nuevas pasan y cubren al menos un caso negativo por componente.
- [ ] Los READMEs documentan estados, eventos, endpoint y componentes.
- [ ] `bun test` (api) y `bun run test` (app) pasan.

## Referencias

- `features/011-reservas-y-asistencia/spec.md`, sección "Fase 4" → tarea 008.

## Fuera de alcance

- Pruebas contra PocketBase real (recorrido manual en 009).

## Notas de implementación

