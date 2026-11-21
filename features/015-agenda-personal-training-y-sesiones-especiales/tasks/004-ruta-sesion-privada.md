# 004 - [Endpoint] `POST /api/admin/sessions/private`

- **Prioridad:** 4
- **Estado:** Pendiente
- **Depende de:** 002, 003
- **Fase:** Fase 3: Servidor

## Objetivo

El staff agenda una sesión privada para uno o dos clientes en una sola operación atómica que respeta reservas y créditos.

## Contexto

La creación de reservas vía `app.save` no pasa por los hooks de petición de 013, por lo que la ruta llama explícitamente a `checkEligibility(app, clientId, session)` (exportada por `memberships-service.ts`). La reserva sigue las reglas de 011 (índice único `(session, client)`, capacidad, `source = admin`). Un `coach` solo puede agendar para sí mismo.

## Alcance

- Añadir la ruta en `api/src/hooks/scheduling.ts` (registro con `routerAdd`) con roles `owner`, `reception`, `coach` (este último solo con `coach = auth.id`).
- Validar cuerpo (`service`, `coach`, `starts_at`, `duration_min`, `client_ids` de 1-2 sin repetir, `notes`, `overrides` opcional por cliente), calcular capacidad con `privateCapacity` consultando las membresías partner, validar con `validatePrivateSession` y crear sesión y reservas dentro de `app.runInTransaction`.
- Si algún cliente no es elegible y no hay `override_note`, devolver `400` con `no_credits`/`weekly_limit` y el cliente afectado; revertir todo.
- Auditoría `custom` con resumen (coach, fecha, clientes).
- Casos en `scripts/verify-api.sh`: uno y dos clientes, partner requerido, choque, sin créditos con y sin override, coach sobre otro coach (`403`).

## Criterios de aceptación

- [ ] Con un cliente crea sesión (capacidad 1) y una reserva `booked`.
- [ ] Con dos clientes partner crea capacidad 2 y dos reservas; con uno no partner devuelve `partner_required`.
- [ ] Si falla la elegibilidad del segundo cliente, no existe la sesión ni la primera reserva.
- [ ] Un coach agendando para otro coach recibe `403`.
- [ ] `bun run build:ts` y `scripts/verify-api.sh` pasan.

## Referencias

- `features/015-agenda-personal-training-y-sesiones-especiales/spec.md`, "Contrato de rutas".
- `api/src/lib/memberships-service.ts` (feature 013).

## Fuera de alcance

- UI (005-007); cobro de la sesión (014 manual).

## Notas de implementación

<!-- Vacío al crear la tarea. -->
