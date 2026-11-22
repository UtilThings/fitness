# 007 - [Pruebas] Pruebas de interfaz y documentación de clientes

- **Prioridad:** 7
- **Estado:** Completado
- **Depende de:** 001, 002, 003, 004, 005, 006
- **Fase:** Fase 3: Verificación y cierre

## Objetivo

La feature queda cubierta por pruebas de interfaz y documentada para quien implemente 011, 013 y 014.

## Contexto

Las pruebas de lógica pura de la API ya existen (002). Falta cubrir los componentes y la vista, y documentar los contratos que consumen las features siguientes. Las vistas se prueban con Vitest y `@vue/test-utils` si la feature 006 lo incorporó; si no, esta tarea añade la dependencia de desarrollo.

## Alcance

- Pruebas Vitest: `ClientForm` (errores por campo), `ClientPicker` (umbral de búsqueda), `ClientsView` (búsqueda y filtro de estado con `pb` simulado), `ClientDetailView` (permiso de la marca de clase gratis por rol, `409` al eliminar), `history-sections` (secciones únicas y claves estables), `admin-nav` (ruta `/clients` presente).
- Documentar en `api/README.md` la colección `clients`, el esquema de `assessment` y las reglas de hooks; en `app/README.md` cómo registrar una sección de historial y cómo usar `ClientPicker`.
- Dejar en el README la decisión pendiente: importación CSV y endpoint de alta externa, fuera de alcance.

## Criterios de aceptación

- [x] Las pruebas nuevas pasan y cubren un caso negativo por componente.
- [x] `api/README.md` y `app/README.md` describen los contratos mencionados y la decisión pendiente.
- [x] `bun test` (api) y `bun run test` (app) pasan en verde.

## Referencias

- `features/010-clientes/spec.md`, sección "Fase 3" → tarea 007.
- https://test-utils.vuejs.org/

## Fuera de alcance

- Pruebas de integración contra PocketBase real (la verificación manual está en 008).

## Notas de implementación


Verificadas 42 pruebas de API y 161 pruebas de app. Se cubren errores de formulario, umbral y respuestas tardías del selector, búsqueda y filtros, permisos de clase gratis, conflicto de borrado, evaluación inválida y claves del historial. Ambos README documentan los contratos y la decisión pendiente de importación.
