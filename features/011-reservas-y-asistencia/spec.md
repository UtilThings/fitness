# Especificación: Reservas y asistencia

- **Estado:** Completado

## Resumen Ejecutivo

Este conjunto de 9 tareas entrega la reserva de clases por parte del personal: la colección `bookings`, una librería pura con las reglas de cupo, lista de espera y cancelación (con pruebas exhaustivas), hooks transaccionales, el endpoint de disponibilidad y la interfaz para reservar, cancelar y marcar asistencia. Los clientes no reservan por su cuenta (no son usuarios autenticables): toda reserva la registra un admin. No implementa créditos ni membresías (013): solo deja documentadas las transiciones que 013 observa.

Entrega:

1. **Colección `bookings`** con índice único (`session`, `client`), reglas de staff y auditoría.
2. **Lib pura `booking-rules`**: ocupación, decisión `booked`/`waitlisted`, promoción de la lista de espera, ventana de cancelación por `services.cancellation_hours`, cancelación tardía y disponibilidad `available`/`almost`/`full`.
3. **Hooks transaccionales**: crear reserva (booked o waitlisted), cancelar (liberar cupo y promover al primero), marcar asistencia, consumo de la clase gratis (`free_class_used`) y reacción a sesión cancelada de 009 (cancelar reservas sin penalizar).
4. **Endpoint de disponibilidad** por sesión y por rango (para el calendario de 009).
5. **Interfaz**: reservar desde la sesión o desde el cliente, lista de inscritos y espera por sesión, cancelación con aviso de ventana y excepción de admin con nota, asistencia (asistió / no se presentó), historial de reservas en el perfil de 010 y disponibilidad real en el calendario de 009.

Contrato que deja a las siguientes features: las transiciones de estado de `bookings` documentadas (013 las observa para créditos; 015 y 018 para agenda y avisos), la función `classifyTransition` y los componentes `BookingDialog` y `SessionRoster`.

---

## Estado actual del repositorio (punto de partida)

| Elemento | Estado |
|----------|--------|
| `api/pb_migrations/` | Última existente `1795260843_created_admins.js`; 005-010 usan timestamps mayores y aún no existen en disco |
| `api/src/lib/`, `api/src/hooks/` | `utils.ts` y `users.ts` (ejemplo); la 005 añade auditoría y `bun test`, la 009 el helper de zona horaria |
| Colecciones `class_sessions`, `services`, `clients`, `admins` | Definidas por contrato (009, 008, 010, 005/007); no existen aún en disco |
| Colección `bookings` | No existe (esta feature la crea) |
| `app/src/views/admin/` | Solo `DashboardView.vue`; las vistas de clases (009) y clientes (010) se crean antes que esta feature |
| Referencia de disponibilidad | `web/src/lib/data.ts::availability(spotsLeft)`: `<=0` full, `<=2` almost, resto available |

> Verificación obligatoria previa: la tarea 001 debe confirmar en la versión fijada de PocketBase que `$app.runInTransaction` está disponible en JS, que los hooks de modelo (`onRecordAfterUpdateSuccess`) se disparan también en guardados internos (p. ej. cuando 009 cancela sesiones por `schedule_blocks`) y qué ofrece goja para fechas; con ello se fija el diseño de 003 y 004.

---

## Contrato HTTP

### Rutas

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/collections/bookings/records` | staff | Lista con `filter` (por `session` o `client`) y `expand` |
| `POST` | `/api/collections/bookings/records` | staff | Crea una reserva; el servidor decide `booked` o `waitlisted` |
| `PATCH` | `/api/collections/bookings/records/:id` | staff | Cancelar o marcar asistencia (transiciones válidas) |
| `GET` | `/api/admin/sessions/{id}/availability` | staff | Disponibilidad de una sesión |
| `GET` | `/api/admin/sessions/availability?from=&to=` | staff | Disponibilidad de sesiones programadas en el rango `[from, to)` (calendario) |

### Cuerpo de creación y cancelación

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| `session`, `client` | Sí (creación) | Relaciones |
| `use_free_class` | No (creación) | `true` si se consume la clase gratis; solo válido con `free_class_used = false` y un plan `is_first_class` activo en el servicio de la sesión; el hook lo traduce al campo `free_class` de la reserva |
| `status` | Sí (PATCH) | `cancelled`, `attended`, `no_show` (las demás las fija el servidor) |
| `override_note` | Condicional | Obligatoria para eximir una cancelación tardía, marcar asistencia antes del inicio o corregirla |
| `override` | No (cancelación) | `true` solicita explícitamente una excepción. Una solicitud de excepción sin motivo devuelve `400` |

### Respuesta de disponibilidad

```
{ "session": "<id>", "capacity": 6, "booked": 4, "waitlisted": 1,
  "spots_left": 2, "availability": "almost", "cancellation_deadline": "2026-11-23T14:00:00Z" }
```

### Errores

| Condición | Respuesta |
|-----------|-----------|
| Sesión cancelada, completada o ya iniciada | `400` `data.session` |
| Cliente `inactive` | `400` `data.client` |
| Reserva duplicada (`session`, `client`) | `400` `data.client` |
| `use_free_class` no elegible | `400` `data.use_free_class` |
| Transición no permitida | `400` `data.status` |
| Cancelación tardía sin `override_note` y sin aceptar penalización | no es error: el servidor guarda `late_cancelled` |

---

## Modelo de datos

### Colección `bookings` (tipo base)

| Campo | Tipo | Reglas | Descripción |
|-------|------|--------|-------------|
| `session` | relation → `class_sessions` | required | Sesión reservada |
| `client` | relation → `clients` | required | Cliente |
| `status` | select | `booked`\|`waitlisted`\|`cancelled`\|`late_cancelled`\|`attended`\|`no_show` | Estado |
| `waitlist_position` | number | ≥ 0 | Posición en espera (1 = el primero); 0 si no aplica |
| `cancelled_at` | date | | Momento de la cancelación |
| `marked_by` | relation → `admins` | | Quien cancela o marca asistencia |
| `source` | select | `admin` | Origen (solo `admin` en el MVP) |
| `override_note` | text | máx. 500 | Motivo de la excepción |
| `free_class` | bool | por defecto false; solo lo fija el hook (se ignora si llega en el cuerpo) | La reserva consumió la primera clase gratis del cliente; permite restituirla automáticamente |

- **Índices:** único `(session, client)`; `idx_bookings_session_status` (`session`, `status`); `idx_bookings_client`.
- **Reglas de API:** `listRule`, `viewRule`, `createRule`, `updateRule` = staff (los hooks restringen campos y transiciones); `deleteRule` = owner. Las reservas no se borran en uso normal: se cancelan.
- **Relaciones y borrado:** `session` y `client` sin `cascadeDelete`; el hook de 010 ya impide borrar clientes con reservas.
- **Re-reserva**: tras cancelar, volver a reservar la misma sesión reactiva el mismo registro (por el índice único) hacia `booked` o `waitlisted`.

### Máquina de estados

```
(nuevo) → booked       si hay cupo
(nuevo) → waitlisted   si booked = capacity
waitlisted → booked    promoción automática al liberarse un cupo
booked | waitlisted → cancelled        (a tiempo, o excepción de admin con nota)
booked → late_cancelled                (dentro de la ventana, sin excepción)
booked → attended | no_show            (desde la hora de inicio de la sesión)
attended ⇄ no_show                     (corrección del admin, con nota)
```

Ocupan cupo `booked`, `attended` y `no_show`; liberan cupo `cancelled` y `late_cancelled`. Una reserva en `waitlisted` que se cancela nunca es tardía.

### Eventos documentados para 013, 015 y 018

`classifyTransition(old, new)` devuelve uno de: `booking.created`, `booking.waitlisted`, `booking.promoted`, `booking.cancelled`, `booking.late_cancelled`, `booking.attended`, `booking.no_show`, `booking.cancelled_by_session`. 013 se engancha con `onRecordAfterCreateSuccess/UpdateSuccess("bookings")` y esta función (no se implementa aquí). Los créditos se descuentan en `attended` y `late_cancel` según 013.

---

## Arquitectura de Cambios

### Fase 1: Modelo y reglas puras (Tareas 001-002)

**001 - Migración de `bookings`**
- `api/pb_migrations/<timestamp>_created_bookings.js` con campos, índices y reglas; añade `bookings` a `audit-config.ts`; documenta los resultados de la verificación previa en las notas.

**002 - Lib de reglas de reserva**
- `api/src/lib/booking-rules.ts` (puro, sin PocketBase): `occupiedSeats`, `spotsLeft`, `availabilityOf`, `decideBookingStatus`, `canBook`, `cancellationDeadline`, `decideCancellation`, `renumberWaitlist`, `pickPromotion`, `shouldRestoreFreeClass`, `canMarkAttendance`, `classifyTransition`.
- `api/src/lib/booking-rules.test.ts` con pruebas exhaustivas (`bun test`).

### Fase 2: Hooks y endpoints (Tareas 003-005)

**003 - Hook de creación de reservas y clase gratis**
- `api/src/hooks/bookings.ts`: `onRecordCreateRequest("bookings")` dentro de `$app.runInTransaction`: valida sesión, cliente y duplicado (reactivando una cancelada), calcula `booked` o `waitlisted` y `waitlist_position`, fuerza `source = admin` y consume la clase gratis marcando `bookings.free_class = true` y `clients.free_class_used = true` con un guardado interno.

**004 - Hooks de cancelación, promoción, asistencia y sesión cancelada**
- `onRecordUpdateRequest("bookings")`: valida la transición, calcula `cancelled` vs `late_cancelled` con `services.cancellation_hours`, exige `override_note` en las excepciones, registra `cancelled_at` y `marked_by`, al liberar un cupo promueve al primero de la lista (`pickPromotion`) y renumera, y restituye `clients.free_class_used = false` cuando la reserva `free_class` pasa a `cancelled` (`shouldRestoreFreeClass`).
- `onRecordUpdate("class_sessions")`: si `status` pasa a `cancelled`, guarda en la misma transacción la sesión, la cancelación sin penalización de las reservas `booked` y `waitlisted` con `override_note = "session_cancelled"`, y las restituciones de clase gratis que correspondan. Los hooks de éxito observan la transacción confirmada.

**005 - Endpoint de disponibilidad**
- `routerAdd` en `api/src/hooks/booking-availability.ts`: `GET /api/admin/sessions/{id}/availability` y `GET /api/admin/sessions/availability?from=&to=` (máximo 62 días), solo staff.

### Fase 3: Interfaz (Tareas 006-007)

**006 - Composable y componentes de reservas**
- `app/src/composables/useBookings.ts` y `useSessionAvailability.ts`; `app/src/lib/bookings.ts` (etiquetas de estado, formato de ventana).
- Componentes en `app/src/components/bookings/`: `AvailabilityTag.vue`, `BookingDialog.vue` (reservar a un cliente en una sesión, con aviso de lista de espera y opción de clase gratis), `CancelBookingDialog.vue` (aviso de ventana y excepción con nota), `SessionRoster.vue` (inscritos, espera y asistencia).

**007 - Integración en vistas de 009 y 010**
- Detalle de sesión de 009: monta `SessionRoster` y el botón «Reservar».
- Calendario de 009: sustituye el cupo estimado por la disponibilidad real (`AvailabilityTag` con el endpoint por rango).
- Perfil del cliente de 010: registra la sección «Reservas» en `history-sections.ts`, botón «Reservar clase» y lista de reservas con estado.

### Fase 4: Verificación y cierre (Tareas 008-009)

**008 - Pruebas de interfaz y documentación**
- Pruebas Vitest de composables y componentes; documentación de las transiciones y eventos en `api/README.md` y `app/README.md`.

**009 - Verificación y cierre**
- `scripts/verify-api.sh` y `scripts/verify-app.sh` en verde; recorrido manual de reserva, lista de espera, cancelación tardía y sesión cancelada.

---

## Impacto por Módulo

| Ruta | Cambio |
|------|--------|
| `api/pb_migrations/` | `<timestamp>_created_bookings.js` |
| `api/src/lib/` | `booking-rules.ts` y su prueba; `audit-config.ts` (entrada `bookings`) |
| `api/src/hooks/` | `bookings.ts`, `booking-availability.ts` |
| `app/src/lib/`, `app/src/composables/` | `bookings.ts`, `useBookings.ts`, `useSessionAvailability.ts` |
| `app/src/components/bookings/` | `AvailabilityTag`, `BookingDialog`, `CancelBookingDialog`, `SessionRoster` |
| `app/src/views/admin/` | Detalle de sesión y calendario de 009; `clients/history-sections.ts` y perfil de 010 |
| `api/README.md`, `app/README.md` | Transiciones, eventos y uso de componentes |

---

## Flujos Críticos

### Flujo 1: Reserva con cupo y con lista de espera
```
1. Recepción abre una sesión con 5 de 6 cupos ocupados y reserva a Ana → booked (1 libre, «Casi llena»)
2. Reserva a Luis → booked (0 libres, «Llena»)
3. Reserva a Marta → waitlisted, waitlist_position = 1
4. Resultado: la sesión muestra 6 inscritos y 1 en espera
```

### Flujo 2: Cancelación a tiempo con promoción
```
1. Ana cancela con más de cancellation_hours de antelación → cancelled
2. El hook libera el cupo y promueve a Marta a booked; la espera se renumera
3. Resultado: 6 inscritos de nuevo. audit_logs registra ambos cambios y 018 podrá avisar a Marta.
```

### Flujo 3: Cancelación tardía y excepción
```
1. Luis cancela 3 h antes de una clase con ventana de 12 h → el diálogo avisa de la penalización
2. Si el admin acepta → late_cancelled (el cupo se libera y se promueve igualmente)
3. Si el admin aplica la excepción con override_note → cancelled sin penalización
4. Resultado: el historial muestra el estado correcto; 013 descontará créditos solo en late_cancelled
```

### Flujo 4: Sesión cancelada por el gimnasio
```
1. 009 cancela una sesión (manual o por un schedule_block)
2. El hook de class_sessions cancela todas las reservas booked y waitlisted como cancelled, sin penalización
3. Resultado: ninguna reserva queda activa en una sesión cancelada
```

### Flujo 5: Clase gratis
```
1. Se reserva a un cliente con free_class_used = false en un servicio con plan is_first_class, marcando «Primera clase gratis»
2. El hook crea la reserva con free_class = true y marca clients.free_class_used = true (guardado interno)
3. Un segundo intento con use_free_class → 400
4. Si la reserva se cancela a tiempo (o se cancela la sesión, o se cancela desde la lista de espera) el hook restituye clients.free_class_used = false
5. Si pasa a late_cancelled, no_show o attended, la clase se considera consumida y no se restituye
```

---

## Notas de Implementación

### Decisiones
- **Reglas en una lib pura**: toda decisión (cupo, espera, ventana, disponibilidad) está en `booking-rules.ts`; los hooks solo cargan datos, llaman a la lib y persisten. Así se prueba exhaustivamente sin PocketBase.
- **Hora de corte en UTC**: `cancellation_deadline = starts_at - cancellation_hours`; todas las comparaciones se hacen en UTC con `Date`, sin `Intl`.
- **Transacción**: creación y cancelación (con promoción) se ejecutan en `$app.runInTransaction` para evitar sobreventa y dobles promociones.
- **Clase gratis con restitución automática**: se consume al crear la reserva (`bookings.free_class = true`, `clients.free_class_used = true`) y se restituye (`free_class_used = false`) cuando esa reserva pasa a `cancelled` (cancelación a tiempo, cancelación desde la lista de espera, excepción del admin o sesión cancelada por el gimnasio). No se restituye en `late_cancelled`, `no_show` ni `attended`. La restitución solo ocurre si el cliente no tiene otra reserva con `free_class = true` en estado `booked`, `attended`, `no_show` o `late_cancelled` (idempotente). Una reactivación de reserva cancelada con `use_free_class` vuelve a consumirla. El owner conserva el restablecimiento manual en el perfil (010).
- **Cliente `paused`** puede reservar (la UI avisa); `inactive` no.
- **`use_free_class` es solo entrada**: llega en el cuerpo (`e.requestInfo().body`) y el hook lo persiste como `bookings.free_class`; el valor de `free_class` enviado directamente se ignora.
- **Eventos como transiciones de registro**, no un bus propio: goja no comparte scope y `classifyTransition` da un vocabulario común.
- **Asistencia desde el inicio de la sesión**; antes solo con `override_note`.

### Migraciones
- `<timestamp>_created_bookings.js` con `up`/`down` y timestamp mayor que el de las migraciones de 005-010; sin backfill.

### Convención PocketBase JS
- Cada callback hace `require(`${__hooks}/lib/booking-rules`)`; la lib sin dependencias de PocketBase se compila a CJS.

### Seguridad
- Todo requiere staff; el servidor ignora `source`, `marked_by` y `waitlist_position` enviados por el cliente.
- Las excepciones quedan en `override_note` y en `audit_logs`.

### Referencias
- https://pocketbase.io/docs/js-event-hooks/
- https://pocketbase.io/docs/js-database/#transaction
- https://pocketbase.io/docs/js-routing/

### Fuera de alcance
- Créditos, membresías y descuentos (013), pagos (014), agenda de Personal Training (015), mensajes automáticos (018).
- Reserva por parte del cliente, portal o formularios de `web/`.
- Reservas recurrentes y bloqueo por falta de plan o de créditos (013).

---

## Criterios de Aceptación

- [x] `bookings` existe con el índice único (`session`, `client`) y reglas de staff; la migración es reversible.
- [x] `booking-rules` tiene pruebas exhaustivas (cupo, espera, promoción, ventana, tardía, disponibilidad) en verde.
- [x] Reservar con cupo da `booked`; sin cupo da `waitlisted` con posición; nunca hay más `booked` que `capacity`.
- [x] Cancelar a tiempo libera el cupo y promueve al primero de la lista; cancelar dentro de la ventana da `late_cancelled`, salvo excepción con `override_note`.
- [x] Cancelar una sesión (manual o por bloqueo) cancela sus reservas sin penalizar.
- [x] La clase gratis solo se consume una vez por cliente y solo en servicios con plan `is_first_class`, y se restituye automáticamente si la reserva se cancela a tiempo, desde la espera o por cancelación de la sesión (no en `late_cancelled`, `no_show` ni `attended`).
- [x] El endpoint de disponibilidad devuelve `available`/`almost`/`full` coherente con `web/src/lib/data.ts::availability`.
- [x] Se puede reservar desde la sesión y desde el cliente; la sesión lista inscritos y espera; se marca asistencia; el perfil de 010 muestra el historial; el calendario de 009 muestra la disponibilidad real.
- [x] Todos los cambios quedan en `audit_logs`.
- [x] `scripts/verify-api.sh` y `scripts/verify-app.sh` terminan en verde.

La validación combinó la aplicación y reversión de la migración, las pruebas unitarias, el recorrido HTTP de `scripts/verify-api.sh` y un recorrido en Chromium con PocketBase 0.40.5 y datos temporales. Se comprobaron la concurrencia del último cupo, las cancelaciones manuales y por bloqueo, el historial, ambos resultados de asistencia y los eventos de auditoría.

---

## Dependencias Entre Tareas

```
Feature 009 (sesiones), Feature 010 (clientes) → 001
Feature 005 (auditoría, bun test)              → 001, 002
001 (migración)                                → 003, 004
002 (lib de reglas)                            → 003, 004, 005, 006
003 (creación)                                 → 004
003, 004, 005                                  → 006
006 (componentes)                              → 007
001-007                                        → 008 (pruebas y docs)
008                                            → 009 (verificación)
```

---

## Validación Post-Deploy

1. `scripts/verify-api.sh` y `scripts/verify-app.sh` en verde; PocketBase arranca y aplica la migración.
2. Con `curl` como staff: crear tantas reservas como `capacity` en una sesión y una más: la última queda `waitlisted`.
3. Cancelar una reserva `booked` a tiempo: la primera en espera pasa a `booked`.
4. Cancelar con la clase a menos de `cancellation_hours`: `late_cancelled`; con `override_note`: `cancelled`.
5. Cancelar la sesión desde 009: todas sus reservas pasan a `cancelled`.
6. `GET /api/admin/sessions/availability?from=...&to=...` devuelve el estado de cada sesión; sin sesión devuelve `401`.

---

## Prompt y modelo utilizado

### Modelo

Sonnet 5.5

### Prompt

```
Contexto: lista de características aprobada del panel de administración de JQ Fitness (CRM/leads descartado explícitamente; clients sí). Las features 005-019 se reparten esa lista según el contrato compartido.

Ok, con base en esta lista estructuremos los features que debemos implementar. Cada feature dejala plasmada en español en features/NNN-.../spec.md, crea las carpetas de ser necesario respetando el consecutivo, puedes usar features/spec-template.md como plantilla. Luego con base en ese spec crea las tareas granulares en features/NNN-.../tasks/NNN-....md, creando un consecutivo ordenado, tasks debidamente priorizadas teniendo en cuenta dependencias resueltas con anterioridad, puedes usar features/task-template.md como plantilla. Ten en cuenta la prelación entre unas y otras de manera de generar todo con la prioridad y orden adecuado.
```
