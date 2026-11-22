# Especificación: Horarios y clases

- **Estado:** Completado

## Resumen Ejecutivo

Este conjunto de 9 tareas entrega la programación de clases de JQ Fitness: plantillas semanales (`class_templates`), sesiones concretas (`class_sessions`) generadas automáticamente en una ventana de semanas, bloqueos por feriado (`schedule_blocks`), operaciones puntuales sobre una sesión (cancelar, mover, cambiar coach) y la UI de administración (calendario semanal, plantillas y bloqueos). No implementa reservas ni asistencia (feature 011) ni notificaciones (018): solo deja el evento de cancelación documentado para que esas features lo consuman.

Entrega:

1. **Colecciones `class_templates`, `class_sessions` y `schedule_blocks`**: modelo del contrato, reglas de API e índice único parcial (`template`, `starts_at`) que garantiza la idempotencia.
2. **Seed de plantillas reales**: las 9 plantillas semanales de `classTemplates` en `web/src/lib/data.ts` (Tropical Jump lunes 7:30 PM, miércoles 7:30 PM y sábado 9:00 AM; Group Strength martes y jueves 9:00 AM, 5:30 PM y 7:00 PM).
3. **Lib pura de tiempo y generación**: conversión hora local `America/New_York` ↔ UTC sin depender de `Intl` (reglas DST de EE. UU.), generación por ventana, exclusión por bloqueos y pruebas del cambio de horario.
4. **Generación idempotente**: ruta `POST /api/admin/sessions/generate` y cron diario de PocketBase; también se genera al crear o activar una plantilla.
5. **Operaciones sobre sesiones**: cancelar con motivo (`status = cancelled`), mover (cancela la original y crea una sesión `special`), reasignar coach y bloqueos por feriado que cancelan las sesiones del rango.
6. **Gancho para features 011 y 018**: la transición `scheduled → cancelled` de `class_sessions` es el evento contractual; 011 cancela las reservas y 018 notifica a los inscritos.
7. **UI**: calendario semanal (`/classes`) con filtro por servicio y por coach, vista de plantillas (`/classes/templates`) con asignación de coach, vista de bloqueos (`/classes/blocks`) y enlace desde la ficha del coach (007).

Contrato que deja a las siguientes: `class_sessions` (capacidad, coach, `starts_at` UTC, `status`) es la base de las reservas (011) y de la agenda de entrenamientos personales (015); la lib `tz` y el evento de cancelación son los puntos de extensión.

---

## Estado actual del repositorio (punto de partida)

| Elemento | Estado |
|----------|--------|
| `api/pb_migrations/` | Solo `1795260741_updated_admins.js` y `1795260843_created_admins.js`; las features 005-008 añaden migraciones posteriores (esta usa timestamps mayores que todas) |
| `api/src/lib/`, `api/src/hooks/` | `utils.ts` y `users.ts` de ejemplo; 005 añade auditoría y `bun test`; 008 añade `catalog.ts` |
| Colecciones `class_templates`, `class_sessions`, `schedule_blocks` | No existen (esta feature las crea) |
| `services`, `admins` con rol, `audit_logs` | No existen en disco todavía: se usan por contrato (features 005, 007 y 008) |
| `app/src/lib/datetime.ts` | No existe; el contrato prevé que la conversión a hora local de la UI viva ahí (con `Intl`). La tarea 006 lo verifica y, si falta, lo crea con lo mínimo |
| `app/src/views/admin/` | Solo `DashboardView.vue`; `admin-nav.ts` tiene marcadores «Clases» (`/classes`, badge falso `70`) y «Rutinas» |
| Datos de referencia | `web/src/lib/data.ts::classTemplates` (`day` 0-6 con 0 = domingo, `time` «7:30 PM», `service`, `coach` «Coach JQ», `capacity` 6/12) y `web/src/lib/schedule.ts` (`weekStart`, `weekDays`, `classesForDay`, filtro por servicio) |

Plantillas reales verificadas en `web/src/lib/data.ts`:

| Día (`weekday`) | Servicio | Horas locales (`start_time`) | Cupo |
|-----------------|----------|------------------------------|------|
| Lunes (1) | Tropical Jump | 19:30 | 12 |
| Martes (2) | Group Strength | 09:00, 17:30, 19:00 | 6 |
| Miércoles (3) | Tropical Jump | 19:30 | 12 |
| Jueves (4) | Group Strength | 09:00, 17:30, 19:00 | 6 |
| Sábado (6) | Tropical Jump | 09:00 | 12 |

La duración no aparece en `web/`; se asume 60 min (decisión a revisar). El coach de `web/` es el nombre «Coach JQ», no una cuenta; el seed deja `coach` vacío y la generación usa `services.default_coach` como respaldo.

`web/src/lib/schedule.ts` es la referencia de comportamiento (semana que empieza en domingo, filtro por servicio), no de implementación: calcula con la zona del navegador, impide semanas pasadas (`Math.max(0, offset)`) y simula cupos con `Math.sin`. El admin necesita zona del negocio, semanas pasadas y datos reales.

> Verificación obligatoria previa: la tarea 003 debe comprobar qué ofrece goja (`typeof Intl`, `Date`, `toLocaleString` con `timeZone`) antes de decidir; el diseño parte de que no es fiable y usa un helper puro con las reglas DST de EE. UU. La tarea 001 debe confirmar la sintaxis de índices con cláusula `WHERE` en migraciones JS de la versión de PocketBase fijada.

---

## Contrato HTTP

Rutas propias (`routerAdd`, middleware `apis.requireAuth("admins")`; el rol se comprueba en el handler y el cuerpo es JSON). El prefijo `/api/admin/` es el elegido para rutas de negocio.

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| `POST` | `/api/admin/sessions/generate` | owner | Genera sesiones de las plantillas activas en la ventana |
| `POST` | `/api/admin/sessions/{id}/cancel` | owner, reception | Cancela una sesión con motivo |
| `POST` | `/api/admin/sessions/{id}/move` | owner, reception | Mueve una sesión (cancela y crea una `special`) |
| `POST` | `/api/admin/class-templates/{id}/assign-coach` | owner | Asigna coach a la plantilla y, opcionalmente, a sesiones futuras |

### Parámetros y respuesta

| Ruta | Cuerpo | Respuesta |
|------|--------|-----------|
| `generate` | `weeks` (opcional, 1-12, por defecto 4), `from` (opcional, `YYYY-MM-DD` local, por defecto hoy local) | `200 {created, skipped_existing, skipped_blocked, window: {from, to}}` |
| `cancel` | `reason` (obligatorio, 3-200 caracteres) | `200` con la sesión actualizada |
| `move` | `starts_at` (ISO UTC, futuro, obligatorio), `coach` (opcional), `reason` (obligatorio) | `200 {cancelled: <sesión>, created: <sesión>}` |
| `assign-coach` | `coach` (id de admin activo con rol distinto de `reception`, o `""` para quitar), `apply_to_future` (bool) | `200 {template, updated_sessions}` |

### Errores

| Condición | Respuesta |
|-----------|-----------|
| Sin sesión | `401` |
| Rol insuficiente | `403` |
| Sesión inexistente | `404` |
| Sesión ya cancelada o completada | `400` «La sesión no se puede cancelar» |
| Falta `reason` o `starts_at` pasado/inválido | `400` con error por campo |
| Fecha del movimiento dentro de un bloqueo o solapada con otra sesión del mismo coach | `400` con mensaje |
| `weeks` fuera de rango | `400` |

### Evento de cancelación (contrato para 011 y 018)

El evento es la **transición de `class_sessions.status` de `scheduled` a `cancelled`**, sin importar el camino (ruta `cancel`, ruta `move`, bloqueo por feriado o edición directa del owner). Cada consumidor registra su propio `onRecordAfterUpdateSuccess("class_sessions", ...)` y detecta la transición con `isCancellationTransition(e.record.original().get("status"), e.record.get("status"))` de `api/src/lib/session-rules.ts`. Datos disponibles: `id`, `service`, `starts_at`, `cancel_reason`, `template`. 011 cancela las reservas de la sesión y promueve/anula la lista de espera sin penalización; 018 envía `class_cancelled`. 009 no escribe en `bookings` ni envía mensajes.

---

## Modelo de datos

### Colección `class_templates` (tipo base)

| Campo | Tipo | Reglas | Descripción |
|-------|------|--------|-------------|
| `service` | relation → `services` | requerido, sin `cascadeDelete` | Servicio de la clase |
| `weekday` | number | requerido, entero 0-6 (0 = domingo; `0` es válido: no marcar `required`) | Día de la semana local |
| `start_time` | text | requerido, patrón `^([01]\d\|2[0-3]):[0-5]\d$` | Hora local del negocio `HH:mm` |
| `duration_min` | number | entero 15-240 | Duración en minutos (60 por defecto) |
| `coach` | relation → `admins` | opcional, sin `cascadeDelete` | Coach (si falta, `services.default_coach`) |
| `capacity` | number | entero ≥ 1 | Cupo copiado a cada sesión |
| `active` | bool | por defecto `true` | Si falso, no genera sesiones |

- **Índices:** único (`service`, `weekday`, `start_time`).
- **Reglas de API:** `listRule`/`viewRule` staff; `createRule`/`updateRule`/`deleteRule` owner.
- **Relaciones y borrado:** `class_sessions.template` sin `cascadeDelete`; el hook rechaza borrar una plantilla con sesiones («desactívala en su lugar»).

### Colección `class_sessions` (tipo base)

| Campo | Tipo | Reglas | Descripción |
|-------|------|--------|-------------|
| `template` | relation → `class_templates` | opcional, sin `cascadeDelete` | Plantilla de origen (vacío para `special` y `private`) |
| `service` | relation → `services` | requerido, sin `cascadeDelete` | Servicio |
| `starts_at` | date | requerido | Inicio en UTC |
| `duration_min` | number | entero 15-240 | Duración |
| `coach` | relation → `admins` | opcional | Coach de la sesión |
| `capacity` | number | entero ≥ 1 | Cupo |
| `status` | select | `scheduled`, `cancelled`, `completed`; por defecto `scheduled` | Estado |
| `kind` | select | `regular`, `special`, `private`; por defecto `regular` | Tipo |
| `cancel_reason` | text | máx. 200 | Motivo de cancelación |
| `notes` | text | máx. 500 | Notas internas |

- **Índices:** único parcial (`template`, `starts_at`) `WHERE template != ''`; sobre `starts_at`; sobre (`service`, `starts_at`).
- **Reglas de API:** `listRule`/`viewRule` staff; `createRule` staff con rol owner o reception (sesiones `special`); `updateRule` igual; `deleteRule` `null` (las sesiones se cancelan, no se borran).
- **Relaciones y borrado:** `bookings.session` (011) sin `cascadeDelete`.

### Colección `schedule_blocks` (tipo base)

| Campo | Tipo | Reglas | Descripción |
|-------|------|--------|-------------|
| `title` | text | requerido, máx. 80 | Nombre («Thanksgiving») |
| `date_from` | text | requerido, patrón `^\d{4}-\d{2}-\d{2}$` | Primer día local bloqueado |
| `date_to` | text | requerido, mismo patrón, ≥ `date_from` (hook) | Último día local bloqueado (inclusive) |
| `reason` | text | opcional, máx. 200 | Nota opcional del bloqueo. Las sesiones guardan el motivo «Bloqueo: <título>» |

- **Decisión de tipo:** `date_from`/`date_to` son texto `YYYY-MM-DD` (no `date` de PocketBase) para que sean fechas locales sin desfase por zona horaria; el contrato las llama «fechas locales».
- **Índices:** sobre (`date_from`, `date_to`).
- **Reglas de API:** `listRule`/`viewRule` staff; `createRule`/`updateRule`/`deleteRule` owner. Los bloqueos aplican a todos los servicios.

### Máquina de estados de la sesión

```
scheduled → cancelled   (motivo obligatorio; dispara el evento de cancelación)
scheduled → completed   (lo marcará la feature 011 al cerrar asistencia)
cancelled → scheduled   (solo owner, «reabrir»; limpia cancel_reason)
completed → (final)
```

---

## Arquitectura de Cambios

### Fase 1: Esquema y datos (Tareas 001-002)

**001 - Migraciones: colecciones de horarios**
- Tres archivos en `api/pb_migrations/` (`created_class_templates`, `created_class_sessions`, `created_schedule_blocks`) con `up`/`down`, reglas e índices (incluido el único parcial).

**002 - Migración: seed de plantillas**
- `<timestamp>_seeded_class_templates.js`: crea las 9 plantillas por (`service` por `slug`, `weekday`, `start_time`) si faltan, sin sobrescribir; `down` elimina las que no tengan sesiones.

### Fase 2: Lógica pura y reglas de servidor (Tareas 003-005)

**003 - Lib: tiempo `America/New_York` y generación de sesiones**
- `api/src/lib/tz.ts`: `nyOffsetMinutes(utcMs)`, `localToUtc(date, hhmm)`, `utcToLocal(utcMs)` → `{date, time, weekday}`, `addDays(date, n)`, `weekdayOf(date)`; reglas DST EE. UU. (segundo domingo de marzo → primer domingo de noviembre, 2:00 local); hora inexistente se adelanta, hora ambigua usa la primera (EDT).
- `api/src/lib/schedule-gen.ts`: `generateSessions({templates, services, blocks, from, weeks, existingKeys})` → sesiones a crear + contadores; `isBlocked(date, blocks)`; `blockRangeUtc(block)`.
- `api/src/lib/session-rules.ts`: `canTransition(from, to)`, `isCancellationTransition`, `validateCancelReason`, `validateMove`.
- Pruebas `bun test`: DST de primavera (domingo 2026-03-08) y otoño (domingo 2026-11-01): una clase de las 19:30 locales es `23:30Z` en horario de verano y `00:30Z` del día siguiente en invierno; 9:00 locales es `13:00Z` / `14:00Z`; semana del cambio sin saltos ni duplicados; hora inexistente (02:30 del 2026-03-08) y ambigua (01:30 del 2026-11-01); bloqueos de un día y de varios; idempotencia.

**004 - Hooks: validaciones, bloqueos, generación al activar y auditoría**
- `api/src/hooks/schedule.ts`: validación de plantillas (servicio activo, coach activo y no `reception`, capacidad ≥ 1), sesiones (transiciones, motivo obligatorio al cancelar, solo owner reabre) y bloqueos (`date_to ≥ date_from`); guardar un bloqueo cancela las sesiones `scheduled` del rango en la misma transacción con motivo «Bloqueo: <título>», y los hooks de cada sesión reciben el evento después de guardar con éxito; al crear/activar una plantilla genera sus sesiones de la ventana; borrado protegido de plantillas con sesiones.
- Registrar `class_templates`, `class_sessions` y `schedule_blocks` en `api/src/lib/audit-config.ts`.

**005 - Endpoints y cron de generación y operaciones**
- `api/src/hooks/schedule-routes.ts`: las cuatro rutas del contrato y `cronAdd("jq_generate_sessions", "0 7 * * *", ...)` (07:00 UTC ≈ 2-3 AM local) con ventana de 4 semanas.

### Fase 3: Interfaz (Tareas 006-008)

**006 - Composables y utilidades del calendario**
- `app/src/lib/datetime.ts` (verificar/crear lo mínimo con `Intl` y `America/New_York`): `localParts(iso)`, `formatTime`, `formatDayLabel`, `localDateRangeToUtc`.
- `app/src/lib/schedule-week.ts`: `weekStart(date, offset)` (domingo, permite semanas pasadas), `weekDays`, `groupByDay(sessions)`, `filterSessions(sessions, {service, coach})`, tomando como referencia `web/src/lib/schedule.ts`.
- `app/src/composables/useSchedule.ts`: carga de sesiones de la semana, plantillas y bloqueos, llamadas a las rutas `generate`/`cancel`/`move`/`assign-coach`.

**007 - Vista: calendario semanal**
- `app/src/views/admin/ClassesView.vue` en `/classes`: navegación semana anterior/siguiente/hoy, filtro por servicio y «Mis clases» (`?coach=`), columnas por día, tarjeta con hora, servicio, coach y cupo, `Drawer` de detalle con cancelar (motivo), mover, cambiar coach y notas; botones «Nueva sesión especial» y «Generar sesiones» (owner).

**008 - Vistas: plantillas y bloqueos, y enlace desde la ficha del coach**
- `ClassTemplatesView.vue` (`/classes/templates`) con `DataTable` agrupada por día, alta/edición, activación y selector de coach en línea (con «aplicar también a sesiones futuras»); `ScheduleBlocksView.vue` (`/classes/blocks`) con confirmación del número de sesiones que se cancelarán; botón «Ver horario» en la ficha del coach (feature 007) hacia `/classes?coach=<id>`; entradas reales en `admin-nav.ts` (sin badge falso).

### Fase final: Verificación y cierre (Tarea 009)

**009 - Pruebas, documentación y verificación**
- Pruebas Vitest de la lib de semana y vistas; comprobaciones contra PocketBase real; documentación del evento de cancelación en `api/README.md`; scripts de verificación en verde.

---

## Impacto por Módulo

| Ruta | Cambio |
|------|--------|
| `api/pb_migrations/` | `created_class_templates`, `created_class_sessions`, `created_schedule_blocks`, `seeded_class_templates` |
| `api/src/lib/` | `tz.ts`, `schedule-gen.ts`, `session-rules.ts` (+ pruebas), `audit-config.ts` |
| `api/src/hooks/` | `schedule.ts`, `schedule-routes.ts` |
| `app/src/lib/`, `app/src/composables/` | `datetime.ts` (si falta), `schedule-week.ts`, `useSchedule.ts` y pruebas |
| `app/src/views/admin/` | `ClassesView.vue`, `ClassTemplatesView.vue`, `ScheduleBlocksView.vue` |
| `app/src/router/index.ts`, `app/src/layouts/admin-nav.ts` | Rutas `/classes`, `/classes/templates`, `/classes/blocks`; entradas reales; se retira el badge `70` |
| Vista de ficha del coach (feature 007) | Enlace «Ver horario» |
| `api/README.md`, `app/README.md` | Horarios, rutas y evento de cancelación |
| `web/` | Sin cambios (referencia de solo lectura) |

---

## Flujos Críticos

### Flujo 1: Generación diaria idempotente
```
1. El cron jq_generate_sessions (o el owner con POST /api/admin/sessions/generate) calcula la ventana desde hoy local, 4 semanas
2. Por cada plantilla activa y día de la ventana construye starts_at en UTC con la hora local del negocio
3. Omite fechas bloqueadas y claves (template, starts_at) existentes; el índice único protege ante carreras
4. Resultado: sesiones nuevas solo donde faltaban; ejecutar dos veces seguidas devuelve created = 0 la segunda vez
```

### Flujo 2: Cambio de horario (DST)
```
1. Plantilla «Tropical Jump lunes 19:30»; el domingo 2026-11-01 termina el horario de verano
2. Lunes 2026-10-26 → 23:30Z (EDT, UTC-4); lunes 2026-11-02 → 00:30Z del 03 (EST, UTC-5)
3. Resultado: la clase sigue a las 7:30 PM locales; la UI (Intl, America/New_York) la muestra a esa hora
```

### Flujo 3: Cancelar una sesión
```
1. Reception abre la tarjeta en el calendario y pulsa Cancelar con el motivo «Coach enfermo»
2. POST /api/admin/sessions/{id}/cancel → status=cancelled, cancel_reason guardado, auditoría
3. La transición dispara el evento: 011 (cuando exista) cancela reservas; 018 notifica
4. Resultado: la tarjeta aparece tachada; el generador no la recrea (la clave existe)
```

### Flujo 4: Mover una sesión
```
1. Owner elige «Mover» a otra fecha/hora con motivo
2. La ruta valida (futuro, fuera de bloqueos, sin choque del coach), cancela la original y crea una sesión kind=special sin plantilla con los mismos servicio, coach y cupo
3. Resultado: la plantilla no regenera la hora original (la sesión cancelada ocupa la clave) y no hay conflicto con el índice único
```

### Flujo 5: Bloqueo por feriado
```
1. Owner crea «Thanksgiving» del 2026-11-26 al 2026-11-26; la UI muestra «Se cancelarán 0-N sesiones» y confirma
2. El hook cancela las sesiones scheduled del rango (motivo «Bloqueo: Thanksgiving»); cada una dispara el evento
3. El generador omite esas fechas en adelante
4. Resultado: sin clases ese día; si se borra el bloqueo, las sesiones ya canceladas siguen canceladas (reabrir es manual) y las no generadas se generan en la siguiente ejecución
```

### Flujo 6: Abuso o dato inválido
```
1. Un coach llama a POST /api/admin/sessions/generate o intenta crear una plantilla
2. La ruta/regla exige owner → 403
3. Resultado: sin cambios; cancelar sin motivo o mover al pasado → 400
```

---

## Notas de Implementación

### Decisiones
- **Sin `Intl` en el servidor**: goja no ofrece soporte fiable de zonas; se implementan las reglas DST de EE. UU. (vigentes desde 2007) en `tz.ts` con pruebas. Alternativa descartada: guardar offsets fijos (rompería en el cambio de horario).
- **Mover = cancelar + crear `special`**: mover el `starts_at` de la sesión original dejaría libre la clave (`template`, `starts_at`) y el generador recrearía la hora original. Con cancelar y crear, la sesión cancelada conserva la clave, y las reservas se tratan con el evento de cancelación (011 podrá ofrecer trasladar a los inscritos). Es una desviación respecto a «mover» literal que conviene revisar.
- **Evento por transición de estado** en lugar de un bus de eventos propio: goja no comparte scope entre hooks; cualquier feature registra su hook sobre `class_sessions` y funciona también con bloqueos y ediciones directas.
- **Generación al crear/activar una plantilla** además del cron: la plantilla nueva es visible de inmediato; el cron cubre el avance de la ventana. Editar la hora o el día de una plantilla no reescribe sesiones ya generadas: se desactiva la anterior y se crea otra (las sesiones futuras existentes se cancelan manualmente).
- **Ventana de 4 semanas por defecto** (máx. 12): suficiente para reservar con antelación sin llenar la base; es una constante en `schedule-gen.ts`.
- **Cron a las 07:00 UTC**: el cron de PocketBase usa UTC; esa hora cae entre 2 y 3 AM en Miramar.
- **Duración 60 min** asumida porque `web/` no la define; ajustable por plantilla.
- **Coach opcional**: `Coach JQ` no es una cuenta; el generador resuelve `template.coach` → `service.default_coach` → vacío, y la UI avisa de sesiones sin coach.
- **Prefijo de rutas `/api/admin/`**: elegido aquí; si la feature 005 fija otro prefijo, ajustar en la tarea 005 y en `useSchedule`.
- **Referencia a `web/src/lib/schedule.ts`**: se reutiliza la lógica de semana (domingo inicial) y filtro por servicio, adaptada a zona del negocio y a semanas pasadas; los cupos simulados (`spotsLeft`) no se portan: el calendario muestra el cupo, y las plazas ocupadas llegan con la feature 011.

### Migraciones
- Archivos en `api/pb_migrations/` con timestamps mayores que el último existente al implementar (verificar con `ls`), cada uno con `up` y `down`.
- El seed busca el servicio por `slug` (de la feature 008); si no existe, falla con un mensaje claro y no inserta nada.

### Convención de código
- Lógica pura y probada en `api/src/lib/*.ts`; los hooks solo orquestan y hacen `require(`${__hooks}/lib/<x>`)` dentro de cada callback.
- La conversión de hora local de la UI usa `Intl` con `America/New_York` en `app/src/lib/datetime.ts`; el servidor, `tz.ts`.
- Las fechas se guardan en UTC; los bloqueos son fechas locales en texto.

### Seguridad
- Rutas con `apis.requireAuth("admins")` y comprobación de `role`; reglas de colección cerradas (lectura staff, escritura owner/reception según tabla); `deleteRule` nula en sesiones.
- `reason`, `title` y `notes` se tratan como texto plano (se escapan en la UI, sin `v-html`).
- Todas las operaciones (generación, cancelación, movimiento, bloqueo) quedan en `audit_logs`.

### Referencias
- https://pocketbase.io/docs/js-routing/
- https://pocketbase.io/docs/js-jobs-scheduling/
- https://pocketbase.io/docs/js-event-hooks/
- https://www.nist.gov/pml/time-and-frequency-division/popular-links/daylight-saving-time (reglas DST de EE. UU.)
- https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat

### Fuera de alcance
- Reservas, lista de espera y asistencia (feature 011); notificaciones (018); agenda de entrenamientos personales y disponibilidad de coaches (015); catálogo público de horarios en `web/` (019).
- Sesiones recurrentes con excepciones complejas, arrastrar y soltar en el calendario, importar/exportar calendarios (iCal).
- CRM, leads y formularios de `web/` (descartados).

---

## Criterios de Aceptación

- [x] Existen `class_templates`, `class_sessions` y `schedule_blocks` con campos, índices (incluido el único parcial) y reglas del modelo; `down` revierte.
- [x] Tras el seed hay 9 plantillas reales; generarlas 4 semanas produce 36 sesiones y repetir la generación crea 0.
- [x] Las pruebas de `tz` y `schedule-gen` cubren el cambio de horario de marzo y noviembre, hora inexistente y ambigua, y pasan con `bun test`.
- [x] Una sesión del cron/ruta nunca duplica (template, `starts_at`) ni aparece en una fecha bloqueada.
- [x] Cancelar exige motivo, deja `status = cancelled` y no se puede cancelar dos veces; mover crea una sesión `special` y cancela la original.
- [x] Crear un bloqueo cancela las sesiones `scheduled` del rango y la UI avisa del número antes de confirmar.
- [x] `coach` y `reception` pueden leer sesiones; solo owner genera, edita plantillas y bloqueos; `reception` puede cancelar y mover.
- [x] `/classes` muestra la semana en hora de Miramar con filtro por servicio y «Mis clases»; navega a semanas pasadas y futuras.
- [x] `/classes/templates` y `/classes/blocks` funcionan; la ficha del coach enlaza a `/classes?coach=<id>`.
- [x] El evento de cancelación (transición de estado) está documentado en `api/README.md` con el ejemplo de hook para 011 y 018.
- [x] `scripts/verify-api.sh` y `scripts/verify-app.sh` terminan en verde.

---

## Dependencias Entre Tareas

```
Feature 008 (services)       → 001, 002
Feature 005 (roles, audit)   → 001, 004
Feature 007 (ficha coach)    → 008
Feature 006 (app base)       → 006, 007, 008
001 (colecciones)            → 002, 004
003 (lib tiempo/generación)  → 004, 005
002, 004                     → 005
005                          → 006
006 (composables)            → 007, 008
007 (calendario)             → 008
002, 005, 007, 008           → 009 (pruebas, docs y verificación)
```

---

## Validación Post-Deploy

1. `cd api && bun test && bun run build:ts` en verde; PocketBase aplica las migraciones y el seed sin errores.
2. Como owner: `POST /api/admin/sessions/generate` → `created: 36` en la primera llamada y `created: 0` en la segunda.
3. Revisar en `/_/` que una sesión de Tropical Jump del lunes 19:30 tiene `starts_at` `23:30Z` o `00:30Z` según el horario vigente, y en `/classes` se ve a las 7:30 PM.
4. Cancelar una sesión sin motivo → 400; con motivo → `cancelled`; llamar de nuevo → 400.
5. Crear un bloqueo para mañana: las sesiones de ese día pasan a `cancelled` y no se regeneran.
6. Con token de `coach`: `POST /api/admin/sessions/generate` → 403; `GET` de sesiones → 200.
7. `cd app && bun run dev`: recorrer `/classes`, `/classes/templates`, `/classes/blocks` y el enlace desde la ficha del coach.
8. `scripts/verify-api.sh` y `scripts/verify-app.sh` → todo en verde.

---

## Prompt y modelo utilizado

### Modelo

Sonnet 5.5

### Contexto

Feature 009 de la lista de características aprobada para la app de administración de JQ Fitness (features 005-019; contrato compartido de colecciones y orden). Prioridad MVP; depende de la feature 008. El CRM/leads queda descartado explícitamente.

### Prompt

```
Ok, con base en esta lista estructuremos los features que debemos implementar. Cada feature dejala plasmada en español en features/NNN-.../spec.md, crea las carpetas de ser necesario respetando el consecutivo, puedes usar features/spec-template.md como plantilla. Luego con base en ese spec crea las tareas granulares en features/NNN-.../tasks/NNN-....md, creando un consecutivo ordenado, tasks debidamente priorizadas teniendo en cuenta dependencias resueltas con anterioridad, puedes usar features/task-template.md como plantilla. Ten en cuenta la prelación entre unas y otras de manera de generar todo con la prioridad y orden adecuado.
```
