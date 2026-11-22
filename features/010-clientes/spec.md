# Especificación: Clientes

- **Estado:** Completado

## Resumen Ejecutivo

Este conjunto de 8 tareas entrega el módulo de clientes del panel: la colección `clients`, sus validaciones por hook, la lista con búsqueda y filtros, el alta manual y el perfil con pestañas (datos, objetivos y notas, evaluación inicial de Personal Training e historial). No implementa reservas (011), membresías (013) ni pagos (014): el historial solo deja los puntos de enganche donde esas features se montan.

Entrega:

1. **Colección `clients`** (migración, índices, email único cuando existe, reglas de API cerradas a staff) con auditoría en `audit_logs`.
2. **Reglas por hook**: normalización de email y teléfono, `free_class_used` modificable por API solo por el owner (el sistema lo marca al consumir la clase gratis), validación del JSON `assessment`, y bloqueo de borrado cuando hay historial (se inactiva en su lugar).
3. **Lista `/clients`** con búsqueda (nombre, email, teléfono), filtro por estado y placeholders de servicio y plan activo que completa la 013, más alta manual.
4. **Perfil `/clients/:id`** con pestañas: Datos, Objetivos y notas, Evaluación inicial (formulario estructurado) e Historial (registro de secciones que consumen 011, 013 y 014).
5. **Cambio de estado** `active` / `paused` / `inactive` y marca visible de primera clase gratis.

Contrato que deja a las siguientes features: la colección `clients` y su `id` como relación, el registro de secciones de historial (`history-sections.ts`), el selector reutilizable de cliente (`ClientPicker`) y las columnas de filtro reservadas para servicio y plan activo.

Alcance: sin CRM. El alta es manual desde el panel; los formularios de `web/` no crean clientes.

---

## Estado actual del repositorio (punto de partida)

| Elemento | Estado |
|----------|--------|
| `api/pb_migrations/` | Contiene `1795260741_updated_admins.js` y `1795260843_created_admins.js` (última); las migraciones de 005-009 usan timestamps mayores y no existen aún en disco |
| `api/src/hooks/`, `api/src/lib/` | Solo `users.ts` (ejemplo, se limpia en 005) y `utils.ts`; el helper de auditoría y `audit-config.ts` los crea la feature 005 |
| `app/src/views/admin/` | Solo `DashboardView.vue`; `admin-nav.ts` tiene la entrada `Clientes` → `/clients` con badge falso (lo retira la 006) |
| Colección `clients` | No existe (esta feature la crea) |
| Colecciones `bookings`, `memberships`, `payments` | No existen todavía (011, 013, 014); el hook de borrado debe tolerar su ausencia |
| Datos | Sin clientes previos; la migración no necesita backfill |

> Verificación obligatoria previa: la tarea 001 debe confirmar en la versión fijada de PocketBase la sintaxis de índices parciales (`WHERE email != ''`) en `collection.indexes` y el comportamiento de `onRecordUpdateRequest` frente a guardados internos (`$app.save`), que no pasan por los hooks `*Request`.

---

## Contrato HTTP

Se usa la API estándar de colecciones (`/api/collections/clients/records`); no hay rutas custom en esta feature.

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/collections/clients/records` | staff | Lista con `filter`, `sort`, `page` |
| `POST` | `/api/collections/clients/records` | staff | Alta manual |
| `PATCH` | `/api/collections/clients/records/:id` | staff | Edición y cambio de estado |
| `DELETE` | `/api/collections/clients/records/:id` | owner | Solo sin historial; con historial responde `409` |

### Errores

| Condición | Respuesta |
|-----------|-----------|
| Email con formato inválido o duplicado | `400` con `data.email` |
| Teléfono no normalizable | `400` con `data.phone` |
| `assessment` no cumple el esquema | `400` con `data.assessment` |
| No-owner cambia `free_class_used` | `400` con `data.free_class_used` |
| Borrado con historial | `409` «El cliente tiene historial; inactívalo en su lugar» |

---

## Modelo de datos

### Colección `clients` (tipo base)

| Campo | Tipo | Reglas | Descripción |
|-------|------|--------|-------------|
| `first_name` | text | required, máx. 80 | Nombre |
| `last_name` | text | required, máx. 80 | Apellido |
| `email` | email | opcional, minúsculas | Único cuando existe |
| `phone` | text | opcional | Normalizado a E.164 (`+1XXXXXXXXXX`) |
| `status` | select | `active`\|`paused`\|`inactive`, required, por defecto `active` | Estado operativo |
| `goals` | text | máx. 2000 | Objetivos del cliente |
| `notes` | text | máx. 4000 | Notas operativas internas |
| `assessment` | json | esquema versionado | Evaluación inicial de Personal Training |
| `free_class_used` | bool | por defecto false | Primera clase gratis ya consumida |
| `joined_on` | date | | Fecha de alta (hora local del negocio) |
| `emergency_contact` | text | máx. 200 | Nombre y teléfono |

- **Índices:** único parcial `idx_clients_email` sobre `email` donde `email != ''`; `idx_clients_status`, `idx_clients_last_name`, `idx_clients_phone`.
- **Reglas de API:** `listRule`, `viewRule`, `createRule`, `updateRule` = staff; `deleteRule` = owner. El hook restringe `free_class_used` y el borrado.
- **Relaciones y borrado:** `bookings.client`, `memberships.client`, `payments.client` y similares se crean sin `cascadeDelete`; el hook impide borrar clientes con historial.

### Esquema de `assessment` (versión 1)

```
{
  "version": 1,
  "completed_on": "2026-11-21",
  "assessed_by": "<admins.id>",
  "medical": { "conditions": "", "injuries": "", "medications": "", "parq_cleared": true },
  "lifestyle": { "activity_level": "sedentary|light|moderate|high", "sleep_hours": 7, "stress_level": 1-5, "nutrition_notes": "" },
  "training": { "experience": "none|beginner|intermediate|advanced", "days_per_week": 0-7, "preferred_times": "", "equipment_access": "" },
  "measurements": { "weight_lb": 0, "height_in": 0, "waist_in": 0, "body_fat_pct": 0 },
  "goals_detail": "",
  "notes": ""
}
```

Todos los bloques son opcionales; se rechazan claves desconocidas y valores fuera de rango.

### Máquina de estados

```
active ⇄ paused
active → inactive
paused → inactive
inactive → active   (reactivación)
```

---

## Arquitectura de Cambios

### Fase 1: Modelo de datos y reglas (Tareas 001-003)

**001 - Migración de la colección `clients`**
- `api/pb_migrations/<timestamp>_created_clients.js` con campos, índices y reglas descritos; `down` elimina la colección.
- Añade `clients` a `api/src/lib/audit-config.ts`.

**002 - Lib de validación y normalización de clientes**
- `api/src/lib/clients.ts` (puro): `normalizeEmail`, `normalizePhone`, `validateAssessment`, `canChangeFreeClass`, `normalizeSearchQuery`.
- Pruebas con `bun test` en `api/src/lib/clients.test.ts`.

**003 - Hooks de `clients`**
- `api/src/hooks/clients.ts`: `onRecordCreateRequest` / `onRecordUpdateRequest` normalizan y validan; solo el owner altera `free_class_used`; completa `joined_on` si falta; `onRecordDeleteRequest` devuelve `409` si hay historial en las colecciones existentes; auditoría mediante el helper de 005.

### Fase 2: Interfaz de clientes (Tareas 004-006)

**004 - Composable y componentes base**
- `app/src/composables/useClients.ts` (lista, búsqueda con debounce, filtros, CRUD, cambio de estado).
- `app/src/lib/clients.ts` (formato de nombre y teléfono, construcción del filtro de búsqueda).
- Componentes: `ClientStatusTag.vue`, `ClientForm.vue`, `ClientPicker.vue` (autocompletar reutilizable por 011).

**005 - Vista de lista y alta manual**
- `app/src/views/admin/ClientsView.vue`: tabla paginada, búsqueda, filtro de estado, columnas/filtros placeholder «Servicio» y «Plan activo» deshabilitados con texto «Disponible con Membresías», diálogo de alta manual.

**006 - Perfil con pestañas, ruta y navegación**
- `app/src/views/admin/ClientDetailView.vue` con pestañas Datos, Objetivos y notas, Evaluación inicial (`AssessmentForm.vue`) e Historial (`ClientHistoryTab.vue` + `history-sections.ts`).
- Cambio de estado, marca de primera clase gratis (edición solo owner), botón Inactivar y borrado (solo owner; ante `409` ofrece inactivar).
- Rutas `/clients` y `/clients/:id` en `router/index.ts`; entrada real en `admin-nav.ts`.

### Fase 3: Verificación y cierre (Tareas 007-008)

**007 - Pruebas de interfaz y documentación**
- Pruebas Vitest de composable, lib y componentes; sección «Clientes» en `api/README.md` y `app/README.md` (incluye decisión pendiente de importación).

**008 - Verificación y cierre**
- `scripts/verify-api.sh` y `scripts/verify-app.sh` en verde; recorrido manual.

---

## Impacto por Módulo

| Ruta | Cambio |
|------|--------|
| `api/pb_migrations/` | `<timestamp>_created_clients.js` |
| `api/src/lib/` | `clients.ts`, `clients.test.ts`, `audit-config.ts` (entrada `clients`) |
| `api/src/hooks/` | `clients.ts` |
| `app/src/lib/`, `app/src/composables/` | `clients.ts`, `useClients.ts` |
| `app/src/components/clients/` | `ClientStatusTag`, `ClientForm`, `ClientPicker`, `AssessmentForm`, `ClientHistoryTab` |
| `app/src/views/admin/` | `ClientsView.vue`, `ClientDetailView.vue`, `clients/history-sections.ts` |
| `app/src/router/index.ts`, `app/src/layouts/admin-nav.ts` | Rutas y entrada real |
| `api/README.md`, `app/README.md` | Documentación |

---

## Flujos Críticos

### Flujo 1: Alta manual
```
1. Recepción abre /clients y pulsa «Nuevo cliente», completa nombre, email y teléfono
2. El hook normaliza (email en minúsculas, teléfono E.164) y completa joined_on → 200
3. Resultado: el cliente aparece en la lista como activo; audit_logs registra la creación
```

### Flujo 2: Email duplicado
```
1. Se intenta crear otro cliente con el mismo email (aunque difiera en mayúsculas)
2. Tras normalizar, el índice único rechaza el registro → 400 data.email
3. Resultado: el formulario muestra «Ya existe un cliente con ese email»; nada se crea
```

### Flujo 3: Borrado con historial
```
1. El owner pulsa «Eliminar» en un cliente con reservas
2. El hook de borrado detecta historial → 409
3. La UI propone «Inactivar»; al aceptar, status = inactive
4. Resultado: el cliente deja de aparecer en el filtro Activos pero conserva su historial
```

### Flujo 4: Primera clase gratis
```
1. Un coach intenta editar free_class_used por la API → 400
2. El sistema (feature 011) lo marca true al consumir la clase gratis (guardado interno)
3. Resultado: el perfil muestra la marca; solo el owner puede corregirla manualmente
```

---

## Notas de Implementación

### Decisiones
- **Teléfono E.164 con prefijo +1 por defecto** (negocio en Florida); números con otro prefijo se aceptan si empiezan por `+` y tienen 8-15 dígitos.
- **El teléfono no es único** (familias comparten número); el formulario solo avisa de coincidencias.
- **`free_class_used` por API solo para owner**: los guardados internos del sistema no pasan por los hooks `*Request`, por lo que 011 puede marcarlo sin ser owner.
- **Borrado**: el hook comprueba la existencia de las colecciones de historial (`bookings`, `memberships`, `payments`, `coaching_programs`) con `findCollectionByNameOrId` dentro de `try/catch`, así es compatible con el orden de implementación.
- **Unidades de la evaluación**: libras y pulgadas (mercado de EE. UU.).
- **Evaluación como JSON validado** (no colecciones aparte): una evaluación inicial por cliente; la edición queda en `audit_logs` con diff.

### Migraciones
- `<timestamp>_created_clients.js` con `up`/`down`, timestamp mayor que el de las migraciones de 005-009.
- Sin datos previos; `down` solo elimina `clients`.

### Convención PocketBase JS
- Lógica pura en `api/src/lib/clients.ts`; el hook hace `require(`${__hooks}/lib/clients`)` dentro de cada callback (goja no comparte scope).

### Seguridad
- Reglas cerradas a staff; borrado solo owner; las notas y la evaluación contienen datos de salud: no se exponen en rutas públicas ni en `web/`.
- Los cambios se auditan (diff de `assessment` incluido).

### Referencias
- https://pocketbase.io/docs/js-event-hooks/
- https://pocketbase.io/docs/js-migrations/
- https://pocketbase.io/docs/api-rules-and-filters/

### Decisión pendiente (fuera de alcance)
- **¿Hará falta importación CSV de clientes existentes o un endpoint de alta externa (p. ej. desde formularios de `web/`)?** No se implementa. Si el negocio ya tiene una base de clientes en hojas de cálculo, valorar una feature de importación posterior; el endpoint externo solo tendría sentido junto a un CRM, descartado.

### Fuera de alcance
- CRM, leads y seguimiento comercial; formularios de `web/`.
- Reservas e historial de asistencia (011), membresías y plan activo (013), pagos (014), comunicaciones (018, `clients.locale`).
- Importación CSV y endpoint de alta externa.

---

## Criterios de Aceptación

- [x] La colección `clients` existe con campos, índices y reglas indicados; la migración es reversible.
- [x] El email se normaliza y es único cuando existe; varios clientes sin email conviven.
- [x] El teléfono se guarda en E.164 y la búsqueda encuentra por nombre, email y teléfono (con o sin formato).
- [x] Solo el owner puede cambiar `free_class_used` por API; un coach o recepcionista recibe `400`.
- [x] `assessment` se valida contra el esquema versionado y se edita con un formulario estructurado.
- [x] La lista filtra por estado y muestra los placeholders de servicio y plan activo; el alta manual funciona.
- [x] El perfil tiene las pestañas Datos, Objetivos y notas, Evaluación inicial e Historial; cambia el estado y muestra la marca de clase gratis.
- [x] Un cliente con historial no se borra (`409`) y se inactiva; sin historial el owner puede borrarlo.
- [x] Los cambios quedan en `audit_logs`.
- [x] `bun test` (api), `scripts/verify-api.sh` y `scripts/verify-app.sh` terminan en verde.

---

## Dependencias Entre Tareas

```
Feature 005 (roles, auditoría) → 001, 003
Feature 006 (app base)         → 004
Feature 008 (planes/servicios) → 005 (placeholders de filtro)
001 (migración)                → 003
002 (lib)                      → 003, 004
003 (hooks)                    → 006
004 (composable y componentes) → 005, 006
005 (lista)                    → 006
001-006                        → 007 (pruebas y docs)
007                            → 008 (verificación)
```

---

## Validación Post-Deploy

1. `scripts/verify-api.sh` y `scripts/verify-app.sh` en verde; arrancar PocketBase aplica la migración sin errores.
2. Crear un cliente con `curl` autenticado como staff y email `Ana@Example.com`: se guarda `ana@example.com`.
3. Repetir con `ana@example.com`: `400` en `data.email`.
4. PATCH de `free_class_used` con un coach: `400`; con el owner: `200`.
5. En la UI: alta manual, búsqueda por teléfono parcial, cambio de estado y borrado bloqueado en un cliente con historial.


La verificación local pasó en PocketBase 0.40.5 y Chromium con datos temporales. Se comprobó el ciclo de migración, el índice parcial, la normalización, los permisos por rol y el guardado interno de la marca de clase gratis. En el panel se verificaron el alta, el duplicado, la búsqueda con teléfono parcial, las transiciones, la evaluación, el borrado y la inactivación ante historial. Se comprobó también el actor y el diff de evaluación en `audit_logs`. Pasaron ambos scripts del repositorio, con 42 pruebas de API y 161 de la app.

---

## Prompt y modelo utilizado

### Modelo

Sonnet 5.5

### Prompt

```
Contexto: lista de características aprobada del panel de administración de JQ Fitness (CRM/leads descartado explícitamente; clients sí). Las features 005-019 se reparten esa lista según el contrato compartido.

Ok, con base en esta lista estructuremos los features que debemos implementar. Cada feature dejala plasmada en español en features/NNN-.../spec.md, crea las carpetas de ser necesario respetando el consecutivo, puedes usar features/spec-template.md como plantilla. Luego con base en ese spec crea las tareas granulares en features/NNN-.../tasks/NNN-....md, creando un consecutivo ordenado, tasks debidamente priorizadas teniendo en cuenta dependencias resueltas con anterioridad, puedes usar features/task-template.md como plantilla. Ten en cuenta la prelación entre unas y otras de manera de generar todo con la prioridad y orden adecuado.
```
