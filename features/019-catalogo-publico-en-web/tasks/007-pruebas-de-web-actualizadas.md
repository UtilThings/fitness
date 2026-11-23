# 007 - [Pruebas] Pruebas de `web/` actualizadas y prueba de contrato

- **Prioridad:** 7
- **Estado:** Completado
- **Depende de:** 003, 005, 006
- **Fase:** Fase 4: Pruebas y cierre

## Objetivo

La suite de `web/` cubre el nuevo origen de datos, el respaldo y el build con la API caída, y detecta cualquier desviación del contrato JSON.

## Contexto

Las pruebas actuales: `src/lib/{data,schedule,env,i18n}.test.ts`, `src/components/{ScheduleBoard,Header,LeadForm}.test.ts` (Vitest + happy-dom) y `tests/dist/routes.test.ts` (requiere `bun run build`, config `vitest.dist.config.ts`). Las tareas 003-006 ya actualizaron lo propio; esta tarea revisa la cobertura global y añade lo que falta.

## Alcance

- Revisar y completar `data.test.ts` (los datos estáticos siguen siendo el respaldo), `schedule.test.ts`, `ScheduleBoard.test.ts` y `env.test.ts` para que ninguna prueba dependa de cupos simulados.
- Añadir `web/src/lib/contract.test.ts` con el JSON de ejemplo de `catalog` y `schedule` del spec y comprobar que pasa las guardas de `api.ts` y que un payload con claves extra o tipos erróneos se rechaza.
- Ampliar `tests/dist/routes.test.ts`: tras el build sin `PUBLIC_API_URL`, `/pricing` y las páginas de servicios contienen los precios de respaldo; `/schedule` contiene el contenedor de la isla.
- Añadir un script de prueba del build con API inalcanzable (`PUBLIC_API_URL=http://127.0.0.1:9`) que verifica que `astro build` termina con código 0 y que `dist/pricing/index.html` usa los precios de respaldo (documentado en `web/README.md` en la 008).
- No modificar código de producción salvo correcciones de errores que las pruebas expongan (registrarlas en notas).

## Criterios de aceptación

- [x] `bun run test` y `bun run test:dist` en `web/` pasan sin depender de la hora real ni de la red.
- [x] La prueba de contrato falla si se renombra o elimina un campo de la respuesta de `catalog` o `schedule`.
- [x] El build con la API inalcanzable termina con código 0 y precios de respaldo.
- [x] No queda ninguna referencia a `spotsLeft` simulado en pruebas ni en código.
- [x] `bun run lint`, `format:check` y `check` pasan.

## Referencias

- `features/019-catalogo-publico-en-web/spec.md`, sección "Fase 4" → tarea 007.
- `web/tests/dist/routes.test.ts`, `web/vitest.config.ts`, `web/vitest.dist.config.ts`.

## Fuera de alcance

- Pruebas de la API (001, 002 y `scripts/verify-api.sh`).
- Pruebas de formularios (sin cambios).

## Notas de implementación

- Las guardas verifican contra los ejemplos del spec todas las claves, incluidas las anidadas. El verificador de web pasó 60 pruebas unitarias, 17 del HTML y un build aislado con la API inalcanzable. La salida temporal comparte el sistema de archivos con Astro para que pueda mover sus assets.
