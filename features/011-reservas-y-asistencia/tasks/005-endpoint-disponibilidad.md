# 005 - [Endpoint] Disponibilidad por sesión y por rango

- **Prioridad:** 5
- **Estado:** Completado
- **Depende de:** 001, 002
- **Fase:** Fase 2: Hooks y endpoints

## Objetivo

La app puede consultar cupos, espera y disponibilidad real de una sesión o de un rango de sesiones.

## Contexto

Las rutas custom se registran con `routerAdd` en archivos de `api/src/hooks/`; el patrón `/api/admin/...` con staff lo fija la feature 005. El calendario de 009 necesita la disponibilidad de decenas de sesiones por vista, por lo que se evita una petición por sesión.

## Alcance

- Crear `api/src/hooks/booking-availability.ts`:
  - `GET /api/admin/sessions/{id}/availability` → `{ session, capacity, booked, waitlisted, spots_left, availability, cancellation_deadline }`.
  - `GET /api/admin/sessions/availability?from=&to=` (fechas `YYYY-MM-DD` locales o ISO UTC; máximo 62 días) → arreglo de la misma estructura por sesión `scheduled`.
- Solo staff (middleware `apis.requireAuth("admins")` más comprobación de `active`).
- Cálculo con `spotsLeft`, `availabilityOf` y `cancellationDeadline` de la lib; consultas agrupadas (una consulta de reservas por rango, sin N+1).
- Errores: sesión inexistente `404`, rango inválido o mayor al máximo `400`, sin sesión `401`.

## Criterios de aceptación

- [x] Con capacidad 6 y 4 reservas: `spots_left = 2` y `availability = "almost"`.
- [x] `late_cancelled` y `cancelled` no cuentan como ocupados; `waitlisted` se reporta aparte.
- [x] El endpoint por rango devuelve una entrada por sesión del rango con una sola consulta de reservas.
- [x] Rango de 90 días devuelve `400`; sin autenticación `401`; un coach activo recibe `200`.
- [x] `bun run build:ts` genera el hook y `bun test` pasa.

## Referencias

- `features/011-reservas-y-asistencia/spec.md`, sección "Contrato HTTP" y "Fase 2" → tarea 005.
- https://pocketbase.io/docs/js-routing/

## Fuera de alcance

- Interfaz del calendario (007); disponibilidad pública para `web/` (019).

## Notas de implementación


Se verificaron ambos endpoints por HTTP con un coach activo, los estados con cupos y lista de espera, el límite de 62 días (incluido un rango local con cambio de hora) y los errores 400, 401 y 404. El rango usa una consulta de reservas y una expansión agrupada de servicios. El extremo to es exclusivo, como en el calendario.
