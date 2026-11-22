# 002 - [Lib] Validación y normalización de clientes

- **Prioridad:** 2
- **Estado:** Completado
- **Depende de:** Ninguna
- **Fase:** Fase 1: Modelo de datos y reglas

## Objetivo

Existe una librería pura y probada con la normalización de email y teléfono, la validación del esquema `assessment` y las reglas sobre `free_class_used`.

## Contexto

Las librerías puras viven en `api/src/lib/*.ts` y compilan con `bun run build:ts` a CJS en `api/pb_hooks/lib/`. Hoy solo existe `utils.ts`. La feature 005 añade el script `test` (`bun test`). Esta lib no usa APIs de PocketBase ni de entorno, para poder probarse con `bun test` y requerirse desde goja.

## Alcance

- Crear `api/src/lib/clients.ts` con:
  - `normalizeEmail(raw): string` (trim, minúsculas, `""` si vacío) y `isValidEmail`.
  - `normalizePhone(raw): { ok: true, value: string } | { ok: false, error: string }`: quita espacios, guiones, paréntesis y puntos; 10 dígitos → `+1XXXXXXXXXX`; 11 dígitos que empiezan por 1 → `+1...`; prefijo `+` con 8-15 dígitos se conserva; vacío → `ok` con `""`.
  - `validateAssessment(input): { ok, errors: Record<string,string>, value }` según el esquema versión 1 del spec (bloques opcionales, claves desconocidas rechazadas, rangos: `stress_level` 1-5, `days_per_week` 0-7, `sleep_hours` 0-24, medidas > 0, selects con valores válidos, fecha `YYYY-MM-DD`).
  - `canChangeFreeClass({ role, from, to }): boolean` (solo owner por API).
  - `normalizeSearchQuery(q): { tokens: string[], digits: string }` para el filtro de búsqueda.
- Pruebas `api/src/lib/clients.test.ts` (`bun test`): emails con mayúsculas/espacios, teléfonos de 10/11 dígitos, con formato `(305) 555-0100`, internacionales e inválidos; assessment válido, vacío, con clave desconocida y fuera de rango; `canChangeFreeClass` para cada rol.

## Criterios de aceptación

- [x] `normalizePhone('(305) 555-0100')` devuelve `+13055550100` y `normalizePhone('123')` devuelve error.
- [x] `validateAssessment` rechaza claves desconocidas y valores fuera de rango con el campo en `errors`.
- [x] `canChangeFreeClass` permite solo al owner.
- [x] `bun test` en `api/` pasa en verde y `bun run build:ts` genera `pb_hooks/lib/clients.js`.

## Referencias

- `features/010-clientes/spec.md`, sección "Fase 1" → tarea 002 y esquema de `assessment`.
- `api/src/lib/utils.ts` (estilo de lib existente).
- https://bun.sh/docs/cli/test

## Fuera de alcance

- Uso desde hooks (003) y desde la UI (004, que tiene su propia `app/src/lib/clients.ts`).

## Notas de implementación


Verificados 42 tests de API y la compilación de pb_hooks/lib/clients.js.
