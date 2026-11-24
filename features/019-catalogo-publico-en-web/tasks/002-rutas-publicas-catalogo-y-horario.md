# 002 - [Endpoint] Rutas públicas `catalog` y `schedule` con caché y CORS

- **Prioridad:** 2
- **Estado:** Completado
- **Depende de:** 001
- **Fase:** Fase 1: API pública

## Objetivo

La API sirve `GET /api/public/catalog` y `GET /api/public/schedule?week=` sin autenticación, con caché corta y CORS limitado a los orígenes configurados.

## Contexto

Las rutas custom se registran con `routerAdd` en `api/src/hooks/*.ts` y compilan a `api/pb_hooks/*.pb.js`; en goja no hay scope compartido. PocketBase aplica por defecto un middleware CORS global (orígenes `*`) y las reglas de las colecciones (008, 009, 011) permanecen cerradas: las rutas leen con acceso interno de `$app`. Antes de implementar, verificar con la versión instalada (`api/pb`): cómo acotar CORS en una ruta custom (`$apis.cors({ allowOrigins })`, interacción con el middleware global y la bandera `--origins`), y cómo fijar `Cache-Control` y `Vary` con `e.response.header().set(...)`. Si el middleware global impide acotar el origen, documentar la bandera `--origins` como parte del despliegue y aplicarla en `api/` (script de arranque y docs).

## Alcance

- Crear `api/src/hooks/public.ts` con las dos rutas; `week` se valida con `normalizeWeek` (`PublicQueryError` → `400` con mensaje genérico); cualquier otro error → `500` sin detalles.
- Consultas: servicios, planes y plantillas activos; sesiones de la semana en límites UTC derivados de la hora local; conteo de reservas por sesión en una sola consulta agrupada; nombre de coach de `admins` solo como nombre de exhibición.
- Caché en servidor con `$app.store()` (30 s; claves `catalog` y `schedule:<week>`) y cabecera `Cache-Control: public, max-age=60, stale-while-revalidate=300`.
- CORS: `PUBLIC_SITE_ORIGINS` (lista separada por comas, `$os.getenv`) define los orígenes permitidos; se refleja el origen solo si está en la lista, con `Vary: Origin`; sin `*`. Variables `PUBLIC_SCHEDULE_MAX_WEEKS` (8) y `PUBLIC_CATALOG_CACHE_SECONDS` (30) con valores por defecto y validación.
- Añadir a `scripts/verify-api.sh` (de 005): `200` sin token en ambas rutas, forma de campos, `400` con `week=2026-02-30` y `week=2099-01-01`, `Access-Control-Allow-Origin` con el origen permitido y ausente con otro, y comprobación de que no aparecen las claves `email`, `client`, `phone`, `notes` ni `id`.

## Criterios de aceptación

- [x] Ambas rutas responden `200` sin autenticación con exactamente el formato del spec.
- [x] Las sesiones `private` y canceladas no aparecen; los cupos coinciden con las reservas reales.
- [x] `Access-Control-Allow-Origin` solo se envía para orígenes de `PUBLIC_SITE_ORIGINS`, y nunca `*`.
- [x] Dos peticiones seguidas dentro de 30 s no repiten las consultas (comprobable con el registro de consultas en modo `--dev`).
- [x] `week` inválido o fuera de rango → `400`; errores internos → `500` sin detalle.
- [x] `bun run build:ts`, `bun test` y `scripts/verify-api.sh` pasan en verde.

## Referencias

- `features/019-catalogo-publico-en-web/spec.md`, sección "Fase 1" → tarea 002.
- `api/src/lib/public-catalog.ts` (tarea 001).
- https://pocketbase.io/docs/js-routing/
- https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS

## Fuera de alcance

- Consumo desde `web/` (004-006).
- Reservas desde el sitio y datos personales de cualquier tipo.

## Notas de implementación

- PocketBase 0.40.5 permite reemplazar el middleware pbCors por ruta mediante su ID. La verificación HTTP comprobó el CORS con la configuración global por defecto, el conteo agrupado, el caché sin consultas repetidas y el 500 genérico con una base temporal.
