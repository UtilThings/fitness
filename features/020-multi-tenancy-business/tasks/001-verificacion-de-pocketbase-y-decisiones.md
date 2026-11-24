# 001 - [Pruebas] Verificación de PocketBase y decisiones técnicas

- **Prioridad:** 1
- **Estado:** Completado
- **Depende de:** Ninguna
- **Fase:** Fase 1: Fundamentos de datos y aislamiento

## Objetivo

Se conoce, con evidencia sobre la versión instalada (`api/pb`, 0.40.5), qué soporta PocketBase para el aislamiento por business y el resto del plan queda confirmado o ajustado antes de tocar el esquema.

## Contexto

Las reglas actuales (`api/src/lib/rules.ts`) no filtran por tenant. Las rutas y hooks corren en goja (`api/pb_hooks/*.pb.js` compilados desde `api/src/hooks`). `tz.ts` implementa a mano el horario de verano de EE. UU. Esta tarea no modifica código de producto.

## Alcance

- Con una instancia temporal (`--dir` en `/tmp`) comprobar y anotar: (1) orden de `onRecordCreateRequest` frente a la validación de campos `required`, y si un hook puede fijar `business` antes de validar; (2) regla `@request.auth.business = business` en `list/view/update/delete` y expansión `expand=business` del propio auth; (3) campo `file` no protegido y URL pública del logo; (4) `Intl.DateTimeFormat` con `timeZone` en goja; (5) `$security` para hash (p. ej. `sha256`) y comparación en tiempo constante (`equal`); (6) eventos de registro de superusuario (`e.auth` vacío) para crear `businesses` desde /_/.
- Registrar resultados y la decisión resultante en `docs/multi-tenancy.md` (borrador, sección «Verificaciones») y en las notas de esta tarea.
- Si algún punto falla, proponer la alternativa y actualizar el spec antes de continuar.

## Criterios de aceptación

- [x] Cada punto del alcance tiene resultado observado (comando y salida resumida) en las notas.
- [x] Se decide y documenta si `tz.ts` usará `Intl` o reglas propias (tarea 009).
- [x] Se confirma o corrige el mecanismo del hook de asignación de `business` (tarea 007).
- [x] No quedan archivos temporales ni cambios en `api/pb_data`.

## Fuera de alcance

- Cualquier migración o cambio de código (002 en adelante).

## Referencias

- `features/020-multi-tenancy-business/spec.md`, sección "Fase 1: Fundamentos de datos y aislamiento" → tarea 001.
- https://pocketbase.io/docs/js-event-hooks/
- https://pocketbase.io/docs/js-overview/

## Notas de implementación

Prueba de integración con `api/pb 0.40.5` y una base desechable. Los comandos, respuestas y decisiones de las seis comprobaciones están en [Verificaciones](../../../docs/multi-tenancy.md#verificaciones).

- `POST` sin relación requerida → 200 tras asignarla en `onRecordCreateRequest`; la lista de B queda vacía y `GET/PATCH/DELETE` de B sobre el registro de A → 404.
- `auth-with-password?expand=business` → 200 con el negocio propio; `GET /api/files/…` sin token → 200 con el archivo original.
- La ruta de diagnóstico devuelve `typeof Intl === "undefined"` y `typeof URL === "undefined"`. La tarea 009 usará reglas de zona en JavaScript.
- El mismo diagnóstico devuelve el SHA-256 esperado de `abc` y resultados `true` y `false` de `$security.equal` para entradas iguales y distintas.
- Con alta de negocio como superusuario, el hook de petición observa `e.hasSuperuserAuth() === true` y el hook de modelo no recibe `e.auth`.
- La instancia y los archivos temporales se eliminaron. La prueba apuntó exclusivamente a `--dir` temporal.
