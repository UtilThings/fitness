# 007 - [Hook] Asignación y consistencia de `business`

- **Prioridad:** 7
- **Estado:** Pendiente
- **Depende de:** 001, 006
- **Fase:** Fase 1: Fundamentos de datos y aislamiento

## Objetivo

El servidor fija el `business` de todo registro nuevo, impide cambiarlo y rechaza relaciones entre registros de distintos business.

## Contexto

Las reglas (006) protegen lectura y edición, pero la creación depende del cuerpo enviado. Hay relaciones entre colecciones (reserva↔cliente↔sesión, membresía↔plan↔cliente, pago↔membresía, sesión↔plantilla↔servicio↔coach…). La verificación 001 define el punto de enganche (antes de la validación `required`).

## Alcance

- `api/src/lib/tenant.ts`: `resolveBusiness(auth)`, `TENANT_REFERENCES` (colección → campos de relación que deben compartir business), `assertSameBusiness(record, related)` (puro con adaptadores para pruebas).
- `api/src/hooks/tenant.ts`: en `onRecordCreateRequest` de cada colección de `TENANT_COLLECTIONS` fija `business` desde `e.auth` (ignora el del cuerpo); un superusuario debe enviarlo explícitamente; en `onRecordUpdateRequest` rechaza cambiar `business` (`400`); valida `TENANT_REFERENCES` (`400` con mensaje genérico).
- Bloquear el login de `admins` cuyo business esté inactivo (`onRecordAuthRequest` de `admins`).
- Los registros creados por código del servidor (crons, generación de sesiones) deben recibir `business` del registro padre; ajustar los creadores existentes para pasarlo.
- Pruebas: unitarias de `tenant.ts` y casos de relaciones cruzadas por colección.

## Criterios de aceptación

- [ ] Crear un registro con `business` de otro business en el cuerpo lo deja en el business del usuario.
- [ ] Editar `business` de un registro → `400`.
- [ ] Una reserva con cliente de otro business, o un pago con membresía de otro business → `400`.
- [ ] Un admin de un business inactivo no puede iniciar sesión.
- [ ] Las sesiones generadas desde plantillas y los registros creados por crons heredan el business correcto.
- [ ] `bun run build:ts` y `bun test` pasan en verde.

## Fuera de alcance

- Moneda, zona y prefijos (009-012).

## Referencias

- `features/020-multi-tenancy-business/spec.md`, sección "Fase 1: Fundamentos de datos y aislamiento" → tarea 007.
- `api/src/hooks/schedule.ts` y `api/src/lib/schedule-store.ts` (creación de sesiones)

## Notas de implementación

<!-- Vacío al crear la tarea. Al completarla, registra archivos creados/modificados, decisiones, desviaciones y hallazgos pendientes. -->
