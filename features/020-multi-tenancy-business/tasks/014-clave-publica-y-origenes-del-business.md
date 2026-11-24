# 014 - [Endpoint] Clave pública y orígenes del business

- **Prioridad:** 14
- **Estado:** Pendiente
- **Depende de:** 001, 002
- **Fase:** Fase 3: API pública por clave

## Objetivo

El owner puede generar o rotar la clave pública de su business y la API conserva solo su hash.

## Contexto

`businesses` ya tiene `public_key_prefix`, `public_key_hash` (oculto), `public_key_rotated_at` y `allowed_origins` (002). La verificación 001 confirma `$security` para hash y comparación en tiempo constante.

## Alcance

- `api/src/lib/business-key.ts`: `generateKey()` (formato `pk_<8 prefijo>_<32 secreto>`, aleatoriedad criptográfica), `hashKey(key)`, `parseKey(key)`, `verifyKey(key, hash)` en tiempo constante.
- `api/src/hooks/business-key.ts`: `POST /api/admin/business/public-key` (owner activo): genera, guarda prefijo, hash y fecha, y responde `{ key, prefix, rotated_at }` una sola vez; `401`/`403` según corresponda.
- Auditar la rotación (acción `public_key_rotated`) sin registrar la clave.
- Pruebas: `business-key.test.ts` (formato, hash, verificación correcta/ incorrecta, entropía mínima, prefijos distintos).

## Criterios de aceptación

- [ ] La respuesta devuelve la clave completa solo en esa llamada; ninguna ruta posterior la expone.
- [ ] Rotar invalida la clave anterior (`verifyKey` falla con el nuevo hash).
- [ ] Solo un owner activo del propio business puede rotar; coach y reception reciben `403`; sin sesión, `401`.
- [ ] La clave no aparece en logs ni en `audit_logs`.
- [ ] `bun run build:ts` y `bun test` pasan en verde.

## Fuera de alcance

- Uso de la clave en las rutas públicas (015) y la interfaz (018).

## Referencias

- `features/020-multi-tenancy-business/spec.md`, sección "Fase 3: API pública por clave" → tarea 014.
- https://pocketbase.io/docs/js-overview/ (`$security`)

## Notas de implementación

<!-- Vacío al crear la tarea. Al completarla, registra archivos creados/modificados, decisiones, desviaciones y hallazgos pendientes. -->
