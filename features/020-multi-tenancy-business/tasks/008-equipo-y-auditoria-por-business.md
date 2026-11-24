# 008 - [Hook] Equipo y auditoría por business

- **Prioridad:** 8
- **Estado:** Pendiente
- **Depende de:** 007
- **Fase:** Fase 1: Fundamentos de datos y aislamiento

## Objetivo

Las reglas de equipo y la auditoría se aplican dentro de cada business.

## Contexto

`api/src/hooks/admins.ts` y `api/src/lib/team-guards.ts` exigen al menos un owner activo y consultan `ADMIN_REFERENCES`; `api/src/hooks/audit.ts` registra altas/cambios/bajas sin tenant.

## Alcance

- `team-guards.ts`: la regla «conservar al menos un owner activo» cuenta solo owners del mismo business; `ADMIN_REFERENCES` se evalúa sin cruzar business.
- `admins.ts`: un owner solo crea integrantes en su business (el hook de 007 fija el campo); el correo de un admin sigue siendo único global (es la credencial de login), documentarlo.
- `audit.ts`: guardar `business` del registro auditado (o del actor); los owners solo leen auditoría de su business.
- Pruebas: `team-guards.test.ts` y `audit.test.ts` con dos business.

## Criterios de aceptación

- [ ] Se puede desactivar al único owner de un business solo si hay otro owner activo en ese mismo business; los owners de otro business no cuentan.
- [ ] Un owner de A no lista ni lee `audit_logs` de B.
- [ ] Cada entrada nueva de `audit_logs` tiene `business`.
- [ ] `bun run build:ts` y `bun test` pasan en verde.

## Fuera de alcance

- Vista de auditoría en la app (sin cambios: ya consume lo que la API filtra).

## Referencias

- `features/020-multi-tenancy-business/spec.md`, sección "Fase 1: Fundamentos de datos y aislamiento" → tarea 008.
- `api/README.md`, «Equipo» y «Auditoría»

## Notas de implementación

<!-- Vacío al crear la tarea. Al completarla, registra archivos creados/modificados, decisiones, desviaciones y hallazgos pendientes. -->
