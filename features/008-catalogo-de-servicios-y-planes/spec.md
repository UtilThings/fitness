# Especificación: Catálogo de servicios y planes

- **Estado:** Completado

## Resumen Ejecutivo

Este conjunto de 9 tareas entrega el catálogo comercial de JQ Fitness dentro del panel de administración: las colecciones `services` y `plans` en PocketBase (con migraciones, reglas, validaciones por hook y datos iniciales idempotentes tomados de `web/src/lib/data.ts`) y las vistas CRUD de `app/` para consultarlas y editarlas (servicios, planes, activación, orden y política de cancelación). No implementa horarios (feature 009), membresías ni cobros (013, 014) ni publica el catálogo en `web/` (019): `web/` sigue con sus datos estáticos.

Entrega:

1. **Colecciones `services` y `plans`**: modelo del contrato (precios en centavos, USD), reglas de API (lectura para staff, escritura solo `owner`) e índices únicos.
2. **Seed idempotente**: 5 servicios (Personal Training 1 a 1, Personal Training Partner, Group Strength, Tropical Jump, Online Coaching) y 10 planes con los precios, cupos y políticas reales de `web/`. Online Coaching queda sin planes (precio no público).
3. **Validaciones y protecciones por hook**: una sola `is_first_class`, precio ≥ 0, plan activo requiere servicio activo, desactivar un servicio desactiva sus planes, y no se borra nada con dependientes (se desactiva).
4. **Vistas de administración**: `ServicesView` y `PlansView` con `DataTable`, formularios en diálogo, interruptor de activación, reordenamiento con flechas y edición de la política de cancelación (horas) del servicio.

Contrato que deja a las siguientes: `services` y `plans` son la fuente de capacidad (`capacity`), política de cancelación (`cancellation_hours`) y precios para las features 009 (plantillas y sesiones), 010 (clientes: `free_class_used` ligado a `is_first_class`), 011 (ventana de cancelación), 013 (membresías: `sessions`, `per_week`, `commitment_periods`), 014 (importes) y 019 (catálogo público).

---

## Estado actual del repositorio (punto de partida)

| Elemento | Estado |
|----------|--------|
| `api/pb_migrations/` | Solo `1795260741_updated_admins.js` y `1795260843_created_admins.js`; las migraciones de las features 005-007 usarán timestamps mayores y esta feature usa timestamps posteriores a todas ellas |
| `api/src/hooks/`, `api/src/lib/` | Solo `users.ts` (hook de ejemplo) y `utils.ts`; la feature 005 añade el helper de auditoría, `audit-config.ts` y el script `test` |
| `api/pb_hooks/` | `users.pb.js` y `lib/utils.js` (compilados con `bun run build:ts`) |
| Colecciones `services`, `plans` | No existen (esta feature las crea) |
| `app/src/views/admin/` | Solo `DashboardView.vue`; `app/src/layouts/admin-nav.ts` tiene marcadores `Planes` (`/plans`) sin vista |
| Datos de referencia | `web/src/lib/data.ts` (`personalOneOnOne`, `personalPartner`, `groupPlans`, `jumpPlans`, `classTemplates`), `web/src/pages/personal-training.astro` (política 24 h), `group-strength-training.astro` y `tropical-jump.astro` (política 12 h; cupo máximo 6) y `online-coaching.astro` («Program pricing is shared after your consultation») |
| Features 005-007 | No existen en disco todavía; se usan solo por contrato (roles, `audit_logs`, `app` base de módulos, coaches como `admins` con `role`) |

Datos reales verificados en `web/` (se copian a los seeds):

| Servicio | Plan | Precio | Unidad | Sesiones | Por semana | Compromiso |
|----------|------|--------|--------|----------|-----------|------------|
| Personal 1 a 1 | 2x / 3x / 4x semana | $800 / $1080 / $1280 | por 4 semanas | 8 / 12 / 16 | 2 / 3 / 4 | 0 |
| Personal Partner | Partner 2x / 3x / 4x | $1127 / $1447 / $1597 | por 4 semanas | 8 / 12 / 16 | 2 / 3 / 4 | 0 |
| Group Strength | 8-Class Pack | $260 | por 4 semanas | 8 | 2 | 0 |
| Group Strength | 16-Week Commitment | $200 | por periodo de 4 semanas | 8 | 2 | 4 |
| Tropical Jump | Single Class | $15 | por clase | 1 | 0 | 0 |
| Tropical Jump | First Class | $0 (FREE) | primera visita | 1 | 0 | 0 (`is_first_class`) |

Cupos: Group Strength 6, Tropical Jump 12 (`classTemplates`); Personal 1 a 1 → 1 y Partner → 2 (dos personas). Políticas de cancelación: personal 24 h; grupales 12 h.

> Verificación obligatoria previa: la tarea 001 debe confirmar contra el PocketBase fijado en `api/pb` (`./pb --version`) la sintaxis de `new Collection`, índices únicos y campos `select`/`relation` de las migraciones JS, leyendo las dos migraciones existentes, y confirmar con `ls api/pb_migrations` el último timestamp (por si las features 005-007 ya se implementaron).

---

## Modelo de datos

### Colección `services` (tipo base)

| Campo | Tipo | Reglas | Descripción |
|-------|------|--------|-------------|
| `name` | text | requerido, máx. 80 | Nombre visible («Group Strength») |
| `slug` | text | requerido, único, patrón `^[a-z0-9]+(-[a-z0-9]+)*$` | Identificador estable (`personal-1-a-1`, `personal-partner`, `group-strength`, `tropical-jump`, `online-coaching`) |
| `kind` | select | requerido: `group`, `personal`, `online` | Tipo; define qué reglas de cupo aplican |
| `description` | text | opcional, máx. 500 | Descripción interna/pública |
| `capacity` | number | entero ≥ 0 | Cupo por clase (group 6 o 12; personal 1 o 2; online 0) |
| `default_coach` | relation → `admins` | opcional, `cascadeDelete` falso | Coach por defecto (lo usa 009 si la plantilla no define coach) |
| `cancellation_hours` | number | entero 0-168 | Horas mínimas de antelación para cancelar sin penalización (24 personal, 12 grupal, 0 online) |
| `active` | bool | por defecto `true` | Visible/contratable |
| `sort` | number | entero ≥ 0 | Orden de presentación |

- **Índices:** único sobre `slug`; sobre (`active`, `sort`).
- **Reglas de API:** `listRule` y `viewRule` = staff (`@request.auth.collectionName = "admins" && @request.auth.active = true`); `createRule`, `updateRule` y `deleteRule` = owner (staff + `@request.auth.role = "owner"`).
- **Relaciones y borrado:** `plans.service` y (en 009) `class_templates.service` / `class_sessions.service` sin `cascadeDelete`; el hook de borrado devuelve un mensaje legible y la API sugiere desactivar.

### Colección `plans` (tipo base)

| Campo | Tipo | Reglas | Descripción |
|-------|------|--------|-------------|
| `service` | relation → `services` | requerido, un valor, sin `cascadeDelete` | Servicio al que pertenece |
| `name` | text | requerido, máx. 80 | Nombre del plan |
| `price_cents` | number | entero ≥ 0, requerido (0 permitido) | Precio en centavos USD; 0 = gratis |
| `billing_unit` | select | requerido: `per_4_weeks`, `per_class`, `first_visit` | Unidad de cobro |
| `sessions` | number | entero ≥ 0 | Sesiones/clases por ciclo (0 = ilimitado o no aplica) |
| `per_week` | number | entero 0-7 | Frecuencia semanal (0 = sin frecuencia fija) |
| `commitment_periods` | number | entero ≥ 0 | Periodos de 4 semanas de compromiso (0 = ninguno; 4 = 16 semanas) |
| `is_first_class` | bool | por defecto `false` | Clase gratuita de bienvenida (una por cliente) |
| `partner` | bool | por defecto `false` | Plan para dos personas |
| `note` | text | opcional, máx. 300 | Nota visible («Requires a 16-week commitment») |
| `active` | bool | por defecto `true` | Disponible para contratar |
| `sort` | number | entero ≥ 0 | Orden dentro del servicio |

- **Índices:** único sobre (`service`, `name`); sobre (`service`, `active`, `sort`).
- **Reglas de API:** las mismas que `services`.
- **Relaciones y borrado:** `memberships.plan` (013) y `payments.plan` (014) bloquean el borrado; mientras no existan esas colecciones, el hook las ignora.

### Reglas de negocio (validadas por hook)

| Regla | Detalle |
|-------|---------|
| Una sola `is_first_class` | Como máximo un plan con `is_first_class = true` en toda la tabla; el plan debe tener `price_cents = 0` y `billing_unit = first_visit` |
| Precio ≥ 0 | `price_cents` entero no negativo; `price_cents = 0` solo si `is_first_class` (los planes pagados deben costar > 0) |
| Plan activo requiere servicio activo | No se puede crear/activar un plan si `service.active = false` |
| Desactivar servicio | Pone `active = false` en todos sus planes (auditado) |
| Cupo y política coherentes | `kind` group/personal requiere `capacity` ≥ 1; `kind` online admite 0; `cancellation_hours` 0-168 |
| No borrar con dependientes | Servicio con planes, plantillas o sesiones, o plan con membresías o pagos: se rechaza el borrado con mensaje «desactívalo en su lugar» |

---

## Arquitectura de Cambios

### Fase 1: Esquema y datos (Tareas 001-004)

**001 - Migración: colección `services`**
- `api/pb_migrations/<timestamp>_created_services.js` con `up`/`down`, campos, índices y reglas del modelo anterior.

**002 - Migración: colección `plans`**
- `api/pb_migrations/<timestamp>_created_plans.js`, relación a `services` sin `cascadeDelete`, índices y reglas.

**003 - Lib: reglas del catálogo y datos semilla**
- `api/src/lib/catalog.ts`: funciones puras `validateService`, `validatePlan`, `canActivatePlan`, `findFirstClassConflict`, `dependentsBlockMessage` y la constante `CATALOG_SEED` (servicios y planes con precios en centavos).
- `api/src/lib/catalog.test.ts` (`bun test`): reglas, mensajes y paridad de `CATALOG_SEED` con `web/src/lib/data.ts` (importa los datos de `web/` y compara precios, sesiones, frecuencias y cupos).

**004 - Migración: seed idempotente del catálogo**
- `api/pb_migrations/<timestamp>_seeded_catalog.js`: crea servicios por `slug` y planes por (`service`, `name`) solo si no existen, sin sobrescribir ediciones posteriores; `down` elimina únicamente los registros sembrados que no tengan dependientes.

### Fase 2: Reglas de servidor (Tarea 005)

**005 - Hooks: validaciones, desactivación en cascada y protección de borrado**
- `api/src/hooks/catalog.ts` (compila a `api/pb_hooks/catalog.pb.js`): `onRecordCreateRequest`/`onRecordUpdateRequest` y `onRecordValidate` para `services` y `plans`, `onRecordDeleteRequest` con comprobación de dependientes (plans, class_templates, class_sessions, memberships, payments; ignora colecciones inexistentes) y `onRecordAfterUpdateSuccess` de `services` para la cascada de desactivación.
- Registrar `services` y `plans` en `api/src/lib/audit-config.ts`.

### Fase 3: Interfaz (Tareas 006-008)

**006 - Composables y utilidades del catálogo**
- `app/src/lib/catalog.ts`: `formatCents` (`$1,080`, `FREE`/«Gratis» si 0), `billingUnitLabel`, `kindLabel`, `reorder(items, id, direction)` que devuelve los `sort` a actualizar, y validación de formularios.
- `app/src/composables/useServices.ts` y `usePlans.ts`: listar, crear, actualizar, activar/desactivar, reordenar y eliminar con el SDK `pb`; errores traducidos a mensajes en español.

**007 - Vista de servicios y ruta**
- `app/src/views/admin/ServicesView.vue`: `DataTable` (nombre, tipo, cupo, política, coach, estado, orden), `Dialog` de alta/edición (incluye `cancellation_hours` y `default_coach`), `ToggleSwitch` de activación con confirmación, botones subir/bajar. Ruta `/services` y entrada «Servicios» en `admin-nav.ts`.

**008 - Vista de planes y ruta**
- `app/src/views/admin/PlansView.vue`: `DataTable` con filtro por servicio, precio formateado, unidad, sesiones, compromiso, marcas «Primera clase» y «Partner»; diálogo de alta/edición con validaciones espejo; activación y orden. Ruta `/plans` (reemplaza el marcador) y entrada real en `admin-nav.ts`.

### Fase final: Verificación y cierre (Tarea 009)

**009 - Pruebas, documentación y verificación**
- Pruebas Vitest de `catalog.ts`, composables y de ambas vistas (render, activación, rechazo por validación); comprobación manual con la API; secciones en `api/README.md` y `app/README.md`; `scripts/verify-api.sh` y `scripts/verify-app.sh` en verde.

---

## Impacto por Módulo

| Ruta | Cambio |
|------|--------|
| `api/pb_migrations/` | `created_services`, `created_plans`, `seeded_catalog` |
| `api/src/lib/` | `catalog.ts`, `catalog.test.ts`, `audit-config.ts` (registro de colecciones) |
| `api/src/hooks/` | `catalog.ts` |
| `api/pb_hooks/` | `catalog.pb.js` y `lib/catalog.js` (generados) |
| `app/src/lib/` | `catalog.ts` y su prueba |
| `app/src/composables/` | `useServices.ts`, `usePlans.ts` y pruebas |
| `app/src/views/admin/` | `ServicesView.vue`, `PlansView.vue` y pruebas |
| `app/src/router/index.ts`, `app/src/layouts/admin-nav.ts` | Rutas `/services` y `/plans`; entradas reales |
| `api/README.md`, `app/README.md` | Documentación del catálogo |
| `web/` | Sin cambios |

---

## Flujos Críticos

### Flujo 1: Primer arranque con seed
```
1. PocketBase aplica created_services, created_plans y seeded_catalog
2. El seed crea los 5 servicios y los 10 planes si no existen
3. Un segundo arranque (o restaurar sobre una base con ediciones) no duplica ni pisa precios editados
4. Resultado: /services lista 5 servicios y /plans 10 planes
```

### Flujo 2: Desactivar un servicio
```
1. Owner pulsa el interruptor de «Tropical Jump» y confirma
2. El hook marca active=false en el servicio y en sus planes y registra el cambio en audit_logs
3. Intentar activar un plan de ese servicio devuelve 400 «El servicio está inactivo»
4. Resultado: no aparece como contratable; sus datos históricos permanecen
```

### Flujo 3: Intento de borrar con dependientes
```
1. Owner intenta eliminar «Group Strength» (tiene planes)
2. El hook de borrado cuenta dependientes y rechaza con 400 «Tiene planes asociados; desactívalo en su lugar»
3. Resultado: registros intactos; la UI ofrece «Desactivar»
```

### Flujo 4: Segunda clase de bienvenida
```
1. Owner marca is_first_class en un segundo plan
2. El hook detecta que ya existe «First Class» → 400 {is_first_class: «Ya existe un plan de primera clase»}
3. Resultado: sin cambios
```

### Flujo 5: Coach intenta editar
```
1. Un admin con role=coach envía PATCH a /api/collections/plans/records/:id
2. updateRule exige owner → 404/403
3. Resultado: el coach solo puede leer el catálogo
```

---

## Notas de Implementación

### Decisiones
- **Personal Training como dos servicios** (`personal-1-a-1` con cupo 1 y `personal-partner` con cupo 2): el cupo es por servicio (contrato) y `web/` separa ambos paquetes. El campo `plans.partner` se mantiene en los planes Partner para filtrar y mostrar sin depender del slug.
- **Online Coaching sin planes sembrados**: `web/online-coaching.astro` indica «Program pricing is shared after your consultation»; el servicio existe (`kind: online`, `capacity: 0`, `cancellation_hours: 0`) y los programas con precio los gestiona la feature 016. Un plan online, si se necesita, se crea a mano (`billing_unit` permitido y `price_cents` > 0).
- **Precios en centavos**: `web` usa dólares enteros; el seed multiplica por 100 y la prueba de paridad lo verifica.
- **Seed sin sobrescritura**: busca por `slug` o (`service`, `name`) y no actualiza registros existentes, para respetar ediciones del owner. Alternativa descartada: `upsert` que restaura valores (destruiría cambios de precios).
- **Una sola `is_first_class` por hook** (no por índice único parcial): permite mensajes por campo y mantiene la regla del contrato; la tarea 005 debe cubrir también las ediciones concurrentes comprobando dentro de la transacción de guardado.
- **Desactivar servicio desactiva sus planes** (en vez de rechazar): evita estados incoherentes con la regla «plan activo requiere servicio activo»; reactivar el servicio no reactiva los planes (decisión consciente del owner).
- **Reordenar con flechas**, no arrastrar: sin dependencias nuevas; cada movimiento intercambia `sort` con el vecino.
- **`default_coach`**: lista `admins` con `active = true` y `role != "reception"`, porque el dueño también imparte clases.
- **Seed del coach**: `default_coach` se deja vacío; el owner lo asigna en la UI (los nombres de `data.ts` no son cuentas).

### Migraciones
- Archivos en `api/pb_migrations/`: `<timestamp>_created_services.js`, `<timestamp>_created_plans.js`, `<timestamp>_seeded_catalog.js`, con timestamps mayores que el último existente en el momento de implementar (verificar con `ls`), cada una con `up` y `down`.
- `down` de las colecciones las elimina; `down` del seed borra solo lo sembrado y sin dependientes.

### Convención de código
- Lógica pura en `api/src/lib/catalog.ts`, con pruebas `bun test`; el hook solo orquesta y en cada callback hace `require(`${__hooks}/lib/catalog`)` (goja no comparte scope).
- Si goja no permite `require` desde migraciones, la tarea 004 incrusta los datos del seed en la migración y la prueba de paridad compara contra `CATALOG_SEED`.
- La UI no calcula reglas de negocio críticas: las valida también el hook.

### Seguridad
- Reglas de API cerradas por defecto: lectura solo staff, escritura solo owner; nada con `""`.
- Borrado protegido por hook además de las reglas.
- Cambios auditados en `audit_logs` mediante el helper de la feature 005 (incluida la desactivación en cascada).

### Referencias
- https://pocketbase.io/docs/js-migrations/
- https://pocketbase.io/docs/js-event-hooks/
- https://pocketbase.io/docs/api-rules-and-filters/
- https://primevue.org/datatable/

### Fuera de alcance
- Horarios, plantillas y sesiones (feature 009), clientes (010), membresías y créditos (013), pagos (014), programas de Online Coaching (016) y publicación en `web/` (019).
- Descuentos, cupones, impuestos, multi-moneda e i18n del catálogo.
- CRM, leads y formularios de `web/` (descartados).

---

## Criterios de Aceptación

- [x] Existen las colecciones `services` y `plans` con los campos, índices y reglas del modelo; `down` las elimina sin error.
- [x] Tras arrancar PocketBase hay 5 servicios y 10 planes con precios, sesiones, frecuencias, compromiso, cupos (6, 12, 1, 2) y políticas (24 h personal, 12 h grupal) iguales a `web/`; arrancar de nuevo no duplica ni modifica registros editados.
- [x] La prueba de paridad compara el seed con `web/src/lib/data.ts` y falla si divergen.
- [x] No se puede tener dos planes `is_first_class`, un precio negativo, un plan pagado con precio 0 ni un plan activo bajo un servicio inactivo (respuesta 400 con mensaje por campo).
- [x] Desactivar un servicio desactiva sus planes; borrar un servicio o plan con dependientes devuelve 400 y sugiere desactivar.
- [x] Un `coach` o `reception` puede listar el catálogo pero no modificarlo; sin sesión no se accede.
- [x] `/services` y `/plans` listan, crean, editan, activan/desactivan y reordenan; el servicio permite editar `cancellation_hours`; los errores del servidor se muestran en el formulario.
- [x] `admin-nav.ts` tiene entradas reales «Servicios» y «Planes» sin badges falsos añadidos por esta feature.
- [x] `scripts/verify-api.sh` y `scripts/verify-app.sh` terminan en verde y la documentación de ambos `README.md` está actualizada.
### Verificación de cierre

- PocketBase 0.40.5 aplicó y revirtió las tres migraciones en bases temporales. Al reaplicar el seed, se conservaron un precio editado y los registros con dependientes.
- La API confirmó los permisos por rol, los errores por campo, la exclusión de altas concurrentes de primera clase, la cascada y la auditoría.
- Vitest verificó las vistas y rutas, la confirmación, el orden y el filtro. `scripts/verify-api.sh` y `scripts/verify-app.sh` terminaron en verde.

---

## Dependencias Entre Tareas

```
Feature 005 (roles, audit)   → 001, 005
Feature 006 (app base)       → 006, 007, 008
Feature 007 (coaches)        → 007
001 (services)               → 002, 003, 004
002 (plans)                  → 004, 005
003 (lib y seed data)        → 004, 005
004 (seed)                   → 009
005 (hooks)                  → 006
006 (composables y utils)    → 007, 008
007 (vista servicios)        → 008
007, 008                     → 009 (pruebas, docs y verificación)
```

---

## Validación Post-Deploy

1. `cd api && bun test && bun run build:ts` en verde; reiniciar PocketBase aplica las tres migraciones sin errores.
2. Panel `/_/`: `services` tiene 5 registros y `plans` 10; reiniciar de nuevo no cambia los conteos.
3. `curl` con token de `coach`: `GET /api/collections/plans/records` → 200; `PATCH` → rechazo.
4. Con token de owner: crear segundo plan con `is_first_class: true` → 400; desactivar un servicio → sus planes quedan `active=false`; `DELETE` de un servicio con planes → 400.
5. `cd app && bun run dev`: iniciar sesión como owner, editar la política de «Group Strength» a 12 h, reordenar y desactivar/activar un plan.
6. `scripts/verify-api.sh` y `scripts/verify-app.sh` → todas las comprobaciones en verde.

---

## Prompt y modelo utilizado

### Modelo

Sonnet 5.5

### Contexto

Feature 008 de la lista de características aprobada para la app de administración de JQ Fitness (features 005-019; contrato compartido de colecciones y orden). Prioridad MVP; depende de 005, 006 y 007. El CRM/leads queda descartado explícitamente.

### Prompt

```
Ok, con base en esta lista estructuremos los features que debemos implementar. Cada feature dejala plasmada en español en features/NNN-.../spec.md, crea las carpetas de ser necesario respetando el consecutivo, puedes usar features/spec-template.md como plantilla. Luego con base en ese spec crea las tareas granulares en features/NNN-.../tasks/NNN-....md, creando un consecutivo ordenado, tasks debidamente priorizadas teniendo en cuenta dependencias resueltas con anterioridad, puedes usar features/task-template.md como plantilla. Ten en cuenta la prelación entre unas y otras de manera de generar todo con la prioridad y orden adecuado.
```
