# 003 - [Migración] Campo `business` en `admins`, catálogo y agenda

- **Prioridad:** 3
- **Estado:** Pendiente
- **Depende de:** 002
- **Fase:** Fase 1: Fundamentos de datos y aislamiento

## Objetivo

`admins`, `services`, `plans`, `class_templates`, `class_sessions`, `schedule_blocks` y `coach_availability` pertenecen a un business y sus unicidades son por business.

## Contexto

Existe un único business (002). Estas colecciones fueron creadas en 004, 005, 008 y 009. `services(slug)` es único global. `admins` es colección de autenticación: agregar el campo no debe invalidar sesiones ni contraseñas.

## Alcance

- Migración `1795266100_added_business_to_admins_and_catalog.js`: por colección, agregar relación `business` (no requerida) → backfill al business por defecto → marcar `required` → índice por `business`.
- `services`: reemplazar `idx_services_slug` por único `(business, slug)`.
- Definir en `api/src/lib/tenant.ts` la constante `TENANT_COLLECTIONS` (se completa en 004 y 005) y una prueba que compare la lista con las colecciones reales.
- Pruebas con `bun test` de la lista; verificación de la migración con una instancia temporal con datos sembrados.

## Criterios de aceptación

- [ ] Todas las filas existentes de las siete colecciones quedan con el business por defecto; `business` es requerido.
- [ ] Dos business pueden tener un servicio con el mismo `slug`; el mismo `slug` en un business se rechaza.
- [ ] Las sesiones de login existentes de `admins` siguen funcionando tras migrar.
- [ ] `down` elimina campo e índices sin borrar datos de dominio.
- [ ] `bun run build:ts` y `bun test` pasan en verde.

## Fuera de alcance

- Reglas (006) y asignación automática (007); sin ellas, los creados desde la API deben enviar `business` hasta completar 007.

## Referencias

- `features/020-multi-tenancy-business/spec.md`, sección "Fase 1: Fundamentos de datos y aislamiento" → tarea 003.
- `api/pb_migrations/1795263000_created_services.js`

## Notas de implementación

<!-- Vacío al crear la tarea. Al completarla, registra archivos creados/modificados, decisiones, desviaciones y hallazgos pendientes. -->
