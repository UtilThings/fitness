# Especificación: Fundamentos de API: roles, reglas y auditoría

- **Estado:** Completado

## Resumen Ejecutivo

Este conjunto de 9 tareas deja en `api/` los cimientos que usarán todas las features de módulo (006-019): roles de administrador (`owner`, `coach`, `reception`), cierre de las reglas de la colección `admins` (hoy el registro está abierto con `createRule: ""`), la colección `audit_logs` con un hook genérico de auditoría, una librería de reglas reutilizable, un helper puro de zona horaria para la lógica de servidor y el andamiaje de pruebas (`bun test`, `scripts/verify-api.sh`, `api/README.md`). No implementa pantallas (006-007) ni gestión de equipo (007).

Entrega:

1. **Roles en `admins`**: campos `role` y `active`, con los admins existentes promovidos a `owner`, y valores por defecto aplicados por hook.
2. **Reglas cerradas**: `createRule` solo owner, `updateRule` owner o el propio registro (sin tocar `role`/`active`), `deleteRule` solo owner y nunca a sí mismo; `authRule` exige `active = true`.
3. **Librería de reglas** (`api/src/lib/rules.ts`): constantes `RULE_STAFF`, `RULE_OWNER` y compositores para que cada feature declare sus reglas sin copiar strings.
4. **Auditoría**: colección `audit_logs`, lógica pura (`audit.ts`, `audit-config.ts`) y un hook genérico que registra create/update/delete de las colecciones listadas.
5. **Helper de fechas** (`api/src/lib/tz.ts`): conversión pura entre hora local de `America/New_York` y UTC, probada, tras verificar qué ofrece goja.
6. **Andamiaje**: limpieza del hook de ejemplo (`users.pb.js`, `utils.ts`), script `bun test`, `scripts/verify-api.sh` y `api/README.md`.

Contrato que deja a las siguientes features: reglas `RULE_STAFF`/`RULE_OWNER`, registro de colecciones auditadas en `audit-config.ts`, `tz.ts` para generación de clases (009) y ventanas de cancelación (011), y el patrón de pruebas de lógica pura.

---

## Estado actual del repositorio (punto de partida)

| Elemento | Estado |
|----------|--------|
| `api/` | PocketBase (binario `api/pb`), `package.json` con scripts `build:ts`, `watch:ts`, `serve:pb`, `dev`; sin script `test` ni `README.md` |
| `api/pb_migrations/` | `1795260741_updated_admins.js` y `1795260843_created_admins.js` (última: `1795260843`) |
| Colección `admins` | Auth con `name`, `avatar`, `email`; `createRule: ""` (registro abierto), `deleteRule: "id = @request.auth.id"`, `authRule: ""`; sin `role` ni `active` |
| `api/src/hooks/` | Solo `users.ts` (ejemplo): se compila a `pb_hooks/users.pb.js`; usa `calcularDescuento` y lee `business` de una colección `businesses` inexistente |
| `api/src/lib/` | Solo `utils.ts` (`calcularDescuento`, ejemplo) |
| `api/src/build.ts` | Borra `pb_hooks/`, compila `src/lib/**` a CJS en `pb_hooks/lib/` y transpila `src/hooks/**` a `*.pb.js` |
| `audit_logs`, `rules.ts`, `audit.ts`, `audit-config.ts`, `tz.ts`, `verify-api.sh`, `api/README.md` | No existen (esta feature los crea) |
| Datos | Puede haber admins creados a mano: la migración de roles debe promoverlos a `owner` |

> Verificación obligatoria previa: la tarea 006 debe comprobar contra el binario `api/pb` fijado qué ofrece goja (`Date.UTC`, `toISOString`, `Intl`, `getTimezoneOffset`) antes de escribir `tz.ts`, y dejar el resultado en las notas de la tarea.

---

## Modelo de datos

### Colección `admins` (auth, existente: se extiende)

| Campo | Tipo | Reglas | Descripción |
|-------|------|--------|-------------|
| `role` | select (`owner`, `coach`, `reception`) | required | Rol del administrador. Por defecto `coach` (aplicado por hook, PocketBase no tiene valor por defecto en select) |
| `active` | bool | | Cuenta habilitada. Por defecto `true` (hook) |

- **Reglas de API:**
  - `listRule` / `viewRule`: `RULE_STAFF`.
  - `createRule`: `RULE_OWNER`.
  - `updateRule`: `RULE_OWNER` o `RULE_STAFF && id = @request.auth.id && @request.body.role:isset = false && @request.body.active:isset = false`.
  - `deleteRule`: `RULE_OWNER && id != @request.auth.id`.
  - `authRule`: `active = true` (un admin desactivado no inicia sesión).
- **Relaciones y borrado:** la protección por registros asociados y por "último owner" es de la feature 007.

### Colección `audit_logs` (base)

| Campo | Tipo | Reglas | Descripción |
|-------|------|--------|-------------|
| `actor` | relation → `admins` | opcional, `cascadeDelete: false` | Quién hizo el cambio (vacío si fue el sistema) |
| `action` | select (`create`, `update`, `delete`, `custom`) | required | Tipo de evento |
| `collection` | text | required | Nombre de la colección afectada |
| `record_id` | text | required | Id del registro afectado |
| `summary` | text | | Descripción breve legible |
| `diff` | json | | Campos cambiados `{campo: {from, to}}` (create: solo `to`; delete: solo `from`), sin campos sensibles |
| `created` | autodate | | Marca de tiempo (UTC) |

- **Índices:** `(collection, record_id)` y `created`.
- **Reglas de API:** `listRule` y `viewRule` = `RULE_OWNER`; `createRule`, `updateRule`, `deleteRule` = `null` (solo hooks internos).

---

## Arquitectura de Cambios

### Fase 1: Roles y reglas (Tareas 001-005)

**001 - Migración y valores por defecto de `role` y `active`**
- `api/pb_migrations/1795261000_updated_admins_role_active.js`: añade `role` (select, primero no requerido), promueve a `owner` todos los admins existentes, y luego marca `role` como requerido; añade `active` (bool) y lo pone en `true` para los existentes. `down` elimina ambos campos.
- `api/src/hooks/admins.ts`: `onRecordCreate` para `admins` que asigna `role = coach` si viene vacío y `active = true` si el cuerpo no trae `active`.

**002 - Migración de `audit_logs`**
- `api/pb_migrations/1795261100_created_audit_logs.js`: colección con los campos e índices del modelo; reglas `listRule`/`viewRule` owner y el resto `null`. `down` la elimina.

**003 - Script `bun test` y limpieza del hook de ejemplo**
- Añadir `"test": "bun test"` a `api/package.json`.
- Eliminar `api/src/hooks/users.ts` y `api/src/lib/utils.ts` (y, al recompilar, `pb_hooks/users.pb.js` y `pb_hooks/lib/utils.js`); `bun run build:ts` debe seguir funcionando con `src/lib` temporalmente vacío (ajustar `build.ts` si falla).
- `api/src/build.ts`: excluir `*.test.ts` de `getFiles` para que las pruebas no se compilen a `pb_hooks/`.
- Ejecutar `bun test` con una prueba mínima que confirme el entorno; las pruebas reales llegan con 004, 006 y 007.

**004 - Librería de reglas y roles**
- `api/src/lib/rules.ts`: `ROLES`, tipo `Role`, `RULE_STAFF`, `RULE_OWNER`, `ruleAnd(...)`, `ruleOr(...)`, `ruleRoles(...roles)` (genera `@request.auth.role = "x" || ...` entre paréntesis), `ruleOwnerOrSelf(lockedFields)`. Funciones puras.
- `api/src/lib/rules.test.ts`: strings exactos, paréntesis correctos y rechazo de roles desconocidos.

**005 - Migración de cierre de reglas de `admins`**
- `api/pb_migrations/1795261200_updated_admins_rules.js`: fija `createRule`, `listRule`, `viewRule`, `updateRule`, `deleteRule` y `authRule` del modelo. Las migraciones no pueden importar `lib/`, así que los strings van literales; una prueba en `rules.test.ts` lee la migración y comprueba que contiene los strings de `rules.ts`, para evitar divergencias. `down` restaura las reglas anteriores (`createRule: ""`, `deleteRule: "id = @request.auth.id"`, `authRule: ""`).

### Fase 2: Fechas y auditoría (Tareas 006-008)

**006 - Helper puro de zona horaria**
- Verificar en goja qué existe y registrarlo en las notas de la tarea.
- `api/src/lib/tz.ts`: calcula el offset de `America/New_York` sin `Intl` (horario de verano de EE. UU.: segundo domingo de marzo 02:00 local a primer domingo de noviembre 02:00 local) y expone `localToUtc(date, time)`, `utcToLocal(isoUtc)`, `localWeekday(isoUtc)`, `addLocalDays(date, n)` y `startOfLocalDay(date)`. Entradas y salidas como strings (`YYYY-MM-DD`, `HH:mm`, ISO UTC).
- `api/src/lib/tz.test.ts`: cambios de horario de verano (marzo y noviembre), hora inexistente (02:30 del salto) y ambigua (01:30 del retroceso), medianoche y año bisiesto.

**007 - Lógica pura de auditoría**
- `api/src/lib/audit-config.ts`: `AUDITED_COLLECTIONS` (inicial: `['admins']`; cada feature añade la suya), `SENSITIVE_FIELDS` (`password`, `tokenKey`, `passwordHash` y cualquier campo `password`) e `isAudited(name)`.
- `api/src/lib/audit.ts`: `computeDiff(before, after)`, `redact(obj)`, `buildSummary(action, collection, record)` y `buildEntry({...})` que devuelven el objeto a guardar. Sin acceso a PocketBase.
- `api/src/lib/audit.test.ts`: diff vacío, campos ignorados (`updated`), redacción, create/delete y resumen.

**008 - Hook genérico de auditoría**
- `api/src/hooks/audit.ts`: `onRecordAfterCreateSuccess`, `onRecordAfterUpdateSuccess` y `onRecordAfterDeleteSuccess` sin filtro de colección; dentro de cada callback `require(`${__hooks}/lib/audit-config`)` y `audit`, se descarta lo que no esté en `AUDITED_COLLECTIONS` y siempre `audit_logs` (evita recursión). Actor = `e.auth` si es de `admins`. Guarda con `e.app.save`; un fallo de auditoría se registra con `e.app.logger().error` y no revierte la operación.
- Comprobación manual: alta, cambio y baja de un admin de prueba generan tres filas en `audit_logs`.

### Fase final: Verificación y cierre (Tarea 009)

**009 - `scripts/verify-api.sh`, README y cierre**
- `scripts/verify-api.sh`: `bun install --frozen-lockfile`, `bun run build:ts`, `bun test` y, si existe `api/pb`, pruebas de humo con `curl` contra una instancia temporal (`--dir` temporal, puerto libre): alta anónima en `admins` → `403`, `GET /api/collections/audit_logs/records` anónimo → lista vacía o `403`.
- `api/README.md`: estructura (`src/hooks`, `src/lib`, `pb_migrations`), cómo compilar y probar, reglas `RULE_STAFF`/`RULE_OWNER`, cómo auditar una colección nueva, limitaciones de goja y `tz.ts`.
- Marcar la feature como completada.

---

## Impacto por Módulo

| Ruta | Cambio |
|------|--------|
| `api/pb_migrations/` | `1795261000_updated_admins_role_active.js`, `1795261100_created_audit_logs.js`, `1795261200_updated_admins_rules.js` |
| `api/src/lib/` | `rules.ts`, `tz.ts`, `audit.ts`, `audit-config.ts` (+ `*.test.ts`); se elimina `utils.ts` |
| `api/src/hooks/` | `admins.ts`, `audit.ts`; se elimina `users.ts` |
| `api/package.json` | Script `test` |
| `scripts/` | `verify-api.sh` |
| `api/README.md` | Nuevo |
| `app/`, `web/` | Sin cambios (la UI consume `role` en 006) |

---

## Flujos Críticos

### Flujo 1: Registro anónimo bloqueado
```
1. Una persona sin sesión envía POST /api/collections/admins/records
2. createRule exige RULE_OWNER → 403
3. Resultado: no se crea ninguna cuenta
```

### Flujo 2: Auditoría de un cambio
```
1. Un owner edita el nombre de un admin
2. onRecordAfterUpdateSuccess llama a audit.buildEntry con original() y el registro nuevo
3. Resultado: fila en audit_logs con actor, action=update, diff {name:{from,to}} y sin campos sensibles
```

### Flujo 3: Intento de escalada de rol
```
1. Un coach envía PATCH sobre su propio registro con role="owner"
2. updateRule exige @request.body.role:isset = false para no-owners → 403/404
3. Resultado: el rol no cambia
```

### Flujo 4: Admin desactivado
```
1. Un owner pone active=false en un admin
2. Su inicio de sesión falla por authRule y su token vigente deja de cumplir RULE_STAFF
3. Resultado: pierde acceso a todas las colecciones protegidas
```

---

## Notas de Implementación

### Decisiones
- **Defaults por hook**: PocketBase no admite valor por defecto en `select` ni en `bool` (un `bool` ausente es `false`); `hooks/admins.ts` los aplica en `onRecordCreate`. Alternativa descartada: exigir el valor siempre desde la UI, que dejaría la API admin inconsistente.
- **Backfill en dos pasos**: añadir `role` como no requerido, asignar `owner`, y recién entonces exigirlo; un campo requerido nuevo falla la validación de los registros existentes.
- **Auditoría después del éxito** (`*AfterSuccess`): no bloquea ni revierte la operación original y ve el registro ya persistido.
- **Hook sin filtro de colección**: goja no comparte scope, y la lista de colecciones auditadas debe vivir en un solo archivo (`audit-config.ts`); se filtra dentro del callback.
- **Reglas en `lib` y literales en migraciones**: las migraciones no cargan `lib/`; la prueba de coherencia evita divergencias.
- **`tz.ts` sin `Intl`**: goja no tiene `Intl` fiable; la regla de horario de verano de EE. UU. es estable y se prueba en las fechas límite.

### Migraciones
- Archivos en `api/pb_migrations/`: `<timestamp>_<verbo>_<objeto>.js` con `migrate((app) => {...}, (app) => {...})`, timestamps mayores que `1795260843`; cada una con `up` y `down`.
- `down` de `role_active` elimina los campos; `down` de reglas restaura las reglas previas.

### Convención de código
- Lógica pura en `api/src/lib/*.ts` (sin `$app`, `__hooks` ni globals de PocketBase), con `*.test.ts` junto al archivo; los tests se excluyen del build de `pb_hooks` (ajustar `getFiles` en `build.ts` para ignorar `*.test.ts`).
- Hooks en `api/src/hooks/*.ts`; dentro de cada callback `require(`${__hooks}/lib/<x>`)`.

### Seguridad
- Reglas cerradas por defecto (`null`); `""` no se usa en ninguna colección nueva.
- `audit_logs` jamás guarda contraseñas, `tokenKey` ni hashes; `redact` se prueba.
- `audit_logs` no puede escribirse desde la API; solo hooks.
- Un admin no puede cambiar su propio `role` ni `active`.

### Referencias
- https://pocketbase.io/docs/js-overview/
- https://pocketbase.io/docs/js-event-hooks/
- https://pocketbase.io/docs/js-migrations/
- https://pocketbase.io/docs/api-rules-and-filters/

### Fuera de alcance
- UI de roles (006) y gestión de equipo, "último owner" y borrado protegido (007).
- Visor de auditoría en la app (no planificado; se consulta desde el panel `/_/`).
- Reglas de las colecciones de negocio (cada feature de módulo las declara con `rules.ts`).

---

## Criterios de Aceptación

- [x] Los admins existentes quedan con `role = owner` y `active = true`; uno nuevo sin `role` recibe `coach`.
- [x] El alta anónima en `admins` devuelve `403`; un coach no puede crear admins, cambiar su `role`/`active` ni borrar a otros; nadie puede borrarse a sí mismo.
- [x] Un admin con `active = false` no puede iniciar sesión.
- [x] `audit_logs` solo la leen owners; no se puede escribir desde la API.
- [x] Crear, editar y borrar un admin genera entradas en `audit_logs` con `actor` y `diff` sin campos sensibles.
- [x] `tz.ts` convierte correctamente en los dos cambios de horario de 2026 y 2027.
- [x] `users.pb.js` y `utils` ya no existen; `bun run build:ts` y `bun test` pasan.
- [x] `scripts/verify-api.sh` y `api/README.md` existen y el script termina en verde.

---

## Dependencias Entre Tareas

```
Feature 003, 004 (contrato)    → 001, 002, 003
001 (role/active)              → 005, 008
003 (test y limpieza)          → 004, 006, 007
004 (rules.ts)                 → 005
002 (audit_logs), 007          → 008
001-008                        → 009 (verificación y cierre)
```

---

## Validación Post-Deploy

1. `scripts/verify-api.sh` en verde.
2. `cd api && ./pb serve --dev`: las tres migraciones se aplican sin errores y los admins existentes aparecen como `owner` en `/_/`.
3. `curl -i -X POST http://127.0.0.1:8090/api/collections/admins/records -H 'Content-Type: application/json' -d '{}'` responde `403`.
4. Editar un admin desde `/_/` y ver el registro en `audit_logs`.

---

## Prompt y modelo utilizado

### Modelo

Sonnet 5.5

### Contexto: lista de características aprobada

Lista aprobada por el usuario (features 005-019, CRM/leads descartado explícitamente; clientes sí; comunicaciones solo propias del servicio): 005 fundamentos de API (roles y auditoría), 006 base de módulos de la app, 007 equipo y coaches (adelantada desde v2), 008 catálogo de servicios y planes, 009 horarios y clases, 010 clientes, 011 reservas y asistencia, 012 dashboard operativo (MVP); 013 membresías y créditos, 014 pagos y recibos, 015 agenda de personal training y sesiones especiales, 016 online coaching, 017 reportes, 019 catálogo público en web (v2); 018 comunicaciones del servicio (v2/después).

### Prompt

```
Ok, con base en esta lista estructuremos los features que debemos implementar. Cada feature dejala plasmada en español en features/NNN-.../spec.md, crea las carpetas de ser necesario respetando el consecutivo, puedes usar features/spec-template.md como plantilla. Luego con base en ese spec crea las tareas granulares en features/NNN-.../tasks/NNN-....md, creando un consecutivo ordenado, tasks debidamente priorizadas teniendo en cuenta dependencias resueltas con anterioridad, puedes usar features/task-template.md como plantilla. Ten en cuenta la prelación entre unas y otras de manera de generar todo con la prioridad y orden adecuado.
```
