# 001 - [Migración] `coach_availability` y campo `title` en `class_sessions`

- **Prioridad:** 1
- **Estado:** Pendiente
- **Depende de:** Feature 009 (contrato), Feature 011 (contrato), Feature 013 (contrato)
- **Fase:** Fase 1: Modelo de datos

## Objetivo

Existen la colección `coach_availability` y el campo opcional `title` en `class_sessions`, ambos reversibles.

## Contexto

`class_sessions` (009) ya admite `kind` con `regular | special | private`; `admins` tiene `role`. `weekday` sigue la convención 0=domingo y `start_time` es `HH:mm` local, igual que `class_templates`. Migraciones en `api/pb_migrations/` con timestamp mayor que el de la última presente. Regla staff: `@request.auth.collectionName = "admins" && @request.auth.active = true`.

## Alcance

- Verificar en la migración de 009 el tipo y formato de `weekday`/`start_time` y el nombre del helper de hora local; anotarlo en notas.
- Crear `api/pb_migrations/<timestamp>_created_coach_availability.js`: campos del spec, índice `(coach, weekday)`, `listRule`/`viewRule` = staff, `createRule`/`updateRule`/`deleteRule` = owner o `coach = @request.auth.id`.
- Crear `api/pb_migrations/<timestamp+1>_added_title_to_class_sessions.js`: campo `title` (text, opcional, máx. 120); `down` elimina solo ese campo.

## Criterios de aceptación

- [ ] `up` y `down` ejecutan sin error y `up` es repetible tras `down`.
- [ ] Un coach crea disponibilidad para sí mismo (`200`) y recibe `403`/`400` al hacerlo para otro coach.
- [ ] Una reception no puede crear disponibilidad; sí puede listarla.
- [ ] `class_sessions` acepta `title` y los registros existentes siguen válidos.
- [ ] `scripts/verify-api.sh` pasa.

## Referencias

- `features/015-agenda-personal-training-y-sesiones-especiales/spec.md`, "Modelo de datos" y "Fase 1".
- https://pocketbase.io/docs/js-migrations/

## Fuera de alcance

- Validaciones de solapes y horarios (002, 003).

## Notas de implementación

<!-- Vacío al crear la tarea. -->
