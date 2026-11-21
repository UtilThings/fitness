# 008 - [Verificación] Documentación y cierre del catálogo público

- **Prioridad:** 8
- **Estado:** Pendiente
- **Depende de:** 002, 003, 004, 005, 006, 007
- **Fase:** Fase 4: Pruebas y cierre

## Objetivo

La integración de `web/` con la API queda documentada, verificada de extremo a extremo y marcada como completada.

## Contexto

`web/README.md` describe rutas, estructura y el calendario simulado (debe actualizarse). `api/README.md` documenta cada módulo. `scripts/verify-api.sh` (005 y 002) comprueba las rutas públicas; `web/` se valida con `lint`, `format:check`, `check`, `test`, `build` y `test:dist`.

## Alcance

- `web/README.md`: de dónde salen los datos (API pública con respaldo `data.ts`), estrategia «build + revalidación en cliente» y por qué no SSR, variables (`PUBLIC_API_URL`, `PUBLIC_API_TIMEOUT_MS`), cuándo reconstruir la imagen (cambios de estructura, no de precios), cómo probar con la API apagada; retirar la frase de los cupos simulados.
- `api/README.md`: rutas públicas, formato de respuesta, `PUBLIC_SITE_ORIGINS`, `PUBLIC_SCHEDULE_MAX_WEEKS`, `PUBLIC_CATALOG_CACHE_SECONDS`, configuración del limitador de tasa de PocketBase para `/api/public/*`, nota de que `--origins` debe ser coherente con el CORS.
- Ejecutar `cd api && bun run build:ts && bun test`, `scripts/verify-api.sh` y, en `web/`, `bun run lint && bun run format:check && bun run check && bun run test && bun run build && bun run test:dist`; construir la imagen Docker con `--build-arg PUBLIC_API_URL` y comprobar que arranca.
- Comprobación manual: cambiar un precio y una clase desde la app y verlo en `/pricing` y `/schedule` sin reconstruir; apagar la API y verificar el respaldo.
- Marcar `- **Estado:** Completado` en `spec.md` y cada tarea, y los criterios cumplidos.

## Criterios de aceptación

- [ ] Ambos README reflejan el comportamiento real y la decisión de arquitectura.
- [ ] `scripts/verify-api.sh` y todos los comandos de `web/` terminan en verde.
- [ ] La imagen Docker de `web/` construye con y sin `PUBLIC_API_URL` y responde `200` en `/`.
- [ ] La comprobación manual confirma datos reales con la API y respaldo sin ella, sin cupos inventados.
- [ ] El spec y las tareas reflejan el estado real (Completado) y sus notas de implementación.

## Referencias

- `features/019-catalogo-publico-en-web/spec.md`, sección "Fase 4" → tarea 008, y "Validación Post-Deploy".

## Fuera de alcance

- Integración de formularios (CRM fuera de alcance) y reservas en línea.

## Notas de implementación

