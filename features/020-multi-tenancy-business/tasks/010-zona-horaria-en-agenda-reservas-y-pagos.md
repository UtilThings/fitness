# 010 - [Módulo] Zona horaria en agenda, reservas, membresías y pagos

- **Prioridad:** 10
- **Estado:** Completado
- **Depende de:** 007, 009
- **Fase:** Fase 2: Zona horaria, moneda y mensajes por business

## Objetivo

La generación de sesiones, reservas, ciclos de membresía y fechas de pago usan la zona del business del registro.

## Contexto

Consumidores directos de `tz.ts`: `schedule-gen.ts`, `schedule-store.ts`, `schedule-routes.ts`, `scheduling*.ts`, `booking-availability.ts`, `membership-cycles.ts`, `memberships-service.ts`, `payments-service.ts`, `payments-store.ts`, `client-request.ts` y los hooks `schedule.ts` y `coaching.ts`.

## Alcance

- Añadir `getBusinessTimezone(app, businessId)` en `api/src/lib/tenant.ts` (con caché por petición) y pasar `tz` desde los stores a las funciones puras.
- Quitar los valores por defecto en estos módulos: la zona es siempre explícita.
- Pruebas: variantes de `schedule-gen`, `membership-cycles` y `booking-availability` con una zona distinta de Nueva York (misma regla, otra hora local).

## Criterios de aceptación

- [x] Un business en `America/Bogota` genera sesiones a la hora local configurada y un business en Nueva York sigue igual que antes.
- [x] Ninguno de estos módulos importa la zona por defecto.
- [x] Las pruebas existentes de estos módulos pasan sin cambiar sus valores esperados (Nueva York).
- [x] `bun run build:ts` y `bun test` pasan en verde.

## Fuera de alcance

- Reportes, dashboard, mensajes y crons (011).

## Referencias

- `features/020-multi-tenancy-business/spec.md`, sección "Fase 2: Zona horaria, moneda y mensajes por business" → tarea 010.
- `api/src/lib/schedule-gen.ts`, `membership-cycles.ts`, `booking-availability.ts`

## Notas de implementación

Agenda, disponibilidad, clientes, coaching, reservas, membresías y pagos reciben la zona del negocio. Se cachea la zona en el contexto de petición cuando se necesita. En la instancia con dos negocios, la plantilla de las 10:00 generó 14:00 UTC en Nueva York y 15:00 UTC en Bogotá en junio. Se preservaron los resultados de Nueva York y se añadieron pruebas de disponibilidad y fecha de inicio en Bogotá. Build y 112 pruebas en verde.
