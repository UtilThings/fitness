# 002 - [Migración] Seed de plantillas reales

- **Prioridad:** 2
- **Estado:** Completado
- **Depende de:** 001, Feature 008 (contrato)
- **Fase:** Fase 1: Esquema y datos

## Objetivo

Una base nueva arranca con las 9 plantillas semanales reales de JQ Fitness, sin duplicados ni sobrescrituras al repetirse.

## Contexto

`web/src/lib/data.ts::classTemplates` define: Tropical Jump lunes y miércoles 7:30 PM y sábado 9:00 AM (cupo 12) y Group Strength martes y jueves 9:00 AM, 5:30 PM y 7:00 PM (cupo 6), con `day` 0-6 (0 = domingo) y coach «Coach JQ» (un nombre, no una cuenta). Los servicios `group-strength` y `tropical-jump` los siembra la feature 008. La duración no está en `web/`: se asume 60 min.

## Alcance

- Crear `api/pb_migrations/<timestamp>_seeded_class_templates.js` (timestamp mayor que 001).
- `up`: resolver cada servicio por `slug` (si falta, lanzar un error claro «servicio X no existe: aplica antes el catálogo»); crear cada plantilla (`weekday`, `start_time` en 24 h: `19:30`, `09:00`, `17:30`, `19:00`; `duration_min: 60`; `capacity` 12 o 6; `coach` vacío; `active: true`) solo si no existe la combinación (`service`, `weekday`, `start_time`); no actualizar existentes.
- `down`: eliminar las plantillas sembradas que no tengan sesiones.
- Límites: no genera sesiones (lo hace la tarea 005) y no asigna coach (UI, tarea 008).

## Criterios de aceptación

- [x] Tras arrancar con base limpia hay 9 plantillas con los días, horas y cupos de la tabla de `web`.
- [x] Editar una plantilla en `/_/` y volver a aplicar el seed no la restaura ni duplica.
- [x] Sin el catálogo previo, la migración falla con un mensaje legible y no inserta nada.
- [x] `down` elimina las sembradas sin sesiones y respeta las que tengan.

## Referencias

- `features/009-horarios-y-clases/spec.md`, "Estado actual" (tabla de plantillas).
- `web/src/lib/data.ts` (`classTemplates`).
- https://pocketbase.io/docs/js-migrations/

## Fuera de alcance

- Generación de sesiones (005), asignación de coach (008).

## Notas de implementación

Verificado contra PocketBase con base limpia, reaplicación tras cambiar hora y cupo, reversión con una sesión vinculada y ausencia del catálogo. Los IDs estables identifican las filas del seed y permiten conservar plantillas editadas y filas preexistentes.
