# 003 - [Lib] Política de envío, ventanas y reintentos

- **Prioridad:** 3
- **Estado:** Completado
- **Depende de:** Ninguna
- **Fase:** Fase 2: Lógica pura

## Objetivo

Existe una librería pura que decide a quién se envía, en qué idioma, cuándo reintentar y qué recordatorios, cobros y renovaciones corresponde avisar en un momento dado, sin duplicados.

## Contexto

`clients.status` es `active|paused|inactive` y `clients.locale` es `es|en` (puede faltar en clientes anteriores). Los avisos de cobro y renovación parten de `payments` (014: `status = pending`, `due_on`) y `memberships` (013: `status = active`, `current_period_end`). Los envíos programados ocurren a las 09:00 hora de `America/New_York`; goja no tiene `Intl`, por lo que la hora local se calcula con el helper de 009 (o `business-time.ts` de 017).

## Alcance

- Crear `api/src/lib/message-policy.ts` con: `resolveLocale(client)` (fallback `es`), `isEligible(client, key)` (`active` y `paused`; nunca `inactive`; requiere correo con formato válido), `nextRetry(attempts, now)` (5 min, 30 min, 2 h; devuelve `null` tras 3 intentos), `reminderTargets(sessions, bookings, now, hours)`, `dueNotices(payments, now, daysBefore)`, `renewalNotices(memberships, now, daysBefore)`.
- Cada función de objetivos devuelve elementos con `dedupeKey` estable (`class_reminder:<bookingId>`, `payment_due:<paymentId>:<due_on>`, `membership_renewal:<membershipId>:<period_end>`).
- `isSendHour(now)` para los crons diarios (09:00-09:59 locales), válido en los días de cambio de horario.
- Pruebas `message-policy.test.ts`: inactivo, pausado, sin correo, correo inválido, locale ausente, backoff completo, recordatorio en el límite de la ventana, sesión cancelada excluida, reserva `waitlisted` excluida del recordatorio, cobro vencido ya avisado, renovación con claves distintas por periodo, hora de envío en 2026-03-08 y 2026-11-01.
- Sin acceso a PocketBase.

## Criterios de aceptación

- [x] `isEligible` devuelve `false` para `inactive` y para correo vacío o mal formado, y `true` para `active` y `paused`.
- [x] `nextRetry(1)`, `(2)` y `(3)` devuelven +5 min, +30 min y `null` respectivamente (a partir del fallo del intento indicado).
- [x] Las mismas entradas producen siempre las mismas `dedupeKey`, y periodos distintos producen claves distintas.
- [x] Un recordatorio solo se genera para reservas `booked` de sesiones `scheduled` dentro de la ventana.
- [x] `bun test` en `api/` pasa en verde.

## Referencias

- `features/018-comunicaciones-del-servicio/spec.md`, sección "Fase 2" → tarea 003.

## Fuera de alcance

- Envío real y escritura de logs (004).
- Registro de crons y hooks (004, 005).

## Notas de implementación

- `bun test` cubre elegibilidad, claves estables, ventanas y ambos cambios de horario. El máximo es de tres intentos totales, con esperas de 5 y 30 minutos.
