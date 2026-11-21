# 003 - [Config] Script bun test y limpieza del hook de ejemplo

- **Prioridad:** 3
- **Estado:** Completado
- **Depende de:** Ninguna
- **Fase:** Fase 1

## Objetivo

`api` tiene `bun test` operativo y ya no contiene el hook ni la librería de ejemplo.

## Contexto

`api/package.json` no tiene script `test`. `api/src/hooks/users.ts` y `api/src/lib/utils.ts` son código de ejemplo: el hook hace referencia a una colección `businesses` inexistente y `calcularDescuento` no se usa en el negocio. `build.ts` borra `pb_hooks/` y compila todo lo de `src/lib` y `src/hooks`; hoy incluiría los `*.test.ts`.

## Alcance

- Añadir `"test": "bun test"` a `api/package.json`.
- Eliminar `api/src/hooks/users.ts` y `api/src/lib/utils.ts`; ejecutar `bun run build:ts` para regenerar `pb_hooks/` sin `users.pb.js` ni `lib/utils.js`.
- Modificar `api/src/build.ts`: `getFiles` ignora `*.test.ts`; la compilación no falla cuando `src/lib` esté vacío o solo tenga pruebas.
- Crear `api/src/lib/smoke.test.ts` temporal con una aserción trivial para confirmar que `bun test` descubre pruebas (se elimina cuando exista la primera prueba real, tarea 004).

## Criterios de aceptación

- [x] `cd api && bun test` termina en verde.
- [x] `bun run build:ts` termina sin errores y `api/pb_hooks/` no contiene `users.pb.js` ni `lib/utils.js`.
- [x] Ningún archivo `*.test.js` aparece en `pb_hooks/`.
- [x] `./pb serve` arranca sin errores de hooks.

## Referencias

- `features/005-api-fundamentos-roles-y-auditoria/spec.md`, sección "Fase 1" → tarea 003.
- `api/src/build.ts`.
- https://bun.sh/docs/cli/test

## Fuera de alcance

- Pruebas reales de reglas, fechas y auditoría (tareas 004, 006, 007).

## Notas de implementación


Pasaron la prueba temporal, el build con una librería que solo contiene pruebas y el arranque de PocketBase. Se verificó que la salida carece del hook de ejemplo, su librería y archivos .test.js.
