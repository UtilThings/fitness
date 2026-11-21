# 001 - [Migración] Campos phone y bio en admins

- **Prioridad:** 1
- **Estado:** Pendiente
- **Depende de:** Feature 005 (contrato)
- **Fase:** Fase 1

## Objetivo

`admins` guarda teléfono y biografía de cada integrante del equipo.

## Contexto

Tras la feature 005 la colección `admins` tiene `role` y `active` y reglas cerradas; no tiene `phone` ni `bio`. La última migración de 005 es `1795261200_updated_admins_rules.js`; esta debe usar un timestamp mayor. Las reglas de actualización permiten al propio usuario editar sus datos y al owner editar los de otros, por lo que no se tocan.

## Alcance

- Crear `api/pb_migrations/1795262000_updated_admins_phone_bio.js` que añade `phone` (text, máx. 30, patrón permisivo `^[0-9+()\-\s.]*$`, no requerido) y `bio` (text, máx. 600, no requerido) a `admins`.
- `down`: elimina ambos campos.
- Idempotente: si el campo ya existe no se duplica.

## Criterios de aceptación

- [ ] `./pb serve` aplica la migración sin errores y `/_/` muestra ambos campos en `admins`.
- [ ] Un PATCH propio con `phone` y `bio` válidos responde `200`; un teléfono con letras responde `400`.
- [ ] `down` elimina los campos sin afectar al resto.

## Referencias

- `features/007-equipo-y-coaches/spec.md`, sección "Fase 1" → tarea 001.
- https://pocketbase.io/docs/js-migrations/

## Fuera de alcance

- Reglas de acceso (ya cerradas en 005) y UI (tareas 005-007).

## Notas de implementación

