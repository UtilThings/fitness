# API de JQ Fitness

La API usa PocketBase. El binario `pb` del repositorio ejecuta las migraciones y carga los hooks compilados. Bun instala las dependencias, compila TypeScript y ejecuta las pruebas.

| Ruta | Contenido |
| --- | --- |
| `src/hooks/` | Hooks de PocketBase escritos en TypeScript |
| `src/lib/` | Funciones reutilizables y pruebas `*.test.ts` |
| `pb_migrations/` | Migraciones de colecciones y datos |
| `pb_hooks/` | Hooks `*.pb.js` y librerías CommonJS que genera el build |
| `pb_data/` | Datos y tipos generados por PocketBase para la instancia local |

## Desarrollo y verificación

Desde `api/`:

```bash
bun install --frozen-lockfile
bun run dev       # Compila en modo watch y sirve PocketBase
bun run build:ts  # Regenera pb_hooks/ y excluye los tests
bun test         # Ejecuta las pruebas de las librerías
```

Desde la raíz, ejecuta `scripts/verify-api.sh`. Instala dependencias con el lockfile, compila y ejecuta las pruebas. Si existe `api/pb`, arranca PocketBase en localhost con datos temporales. Comprueba permisos, auditoría, catálogo, crons y aislamiento entre dos negocios antes y después del reinicio.

## Roles y reglas

`src/lib/rules.ts` define `RULE_STAFF` para admins activos y `RULE_OWNER` para quienes además tienen el rol `owner`. Usa `ruleAnd` y `ruleOr` para combinar cláusulas, `ruleRoles` para limitar el acceso a roles concretos y `ruleOwnerOrSelf` para permitir que cada admin edite su propio registro con campos protegidos.

Las migraciones guardan las reglas como literales. Combina los roles con `ruleBusiness` para limitar lista, lectura, actualización y borrado a `@request.auth.business = business`. El servidor asigna esa relación al crear y valida las referencias al guardar. Registra las colecciones nuevas y sus relaciones en `TENANT_COLLECTIONS` y `TENANT_REFERENCES`.

En una base nueva, un superusuario de PocketBase crea el negocio y el primer admin desde `/_/`. Al admin asígnale el negocio, `role = owner` y `active = true`. La colección `_superusers` administra la instancia y sus privilegios son independientes de los roles de la aplicación.

La colección heredada `users` tiene el alta pública cerrada. Su regla de autenticación conserva el acceso mediante credenciales de las cuentas existentes. La app y las rutas staff usan `admins`. El [procedimiento de alta](../docs/multi-tenancy.md#dar-de-alta-un-negocio) describe la configuración inicial.

## Equipo: reglas y `ADMIN_REFERENCES`

Cada admin pertenece a un negocio. Los controles de último owner y referencias se aplican dentro de ese negocio. El correo de acceso sigue siendo único en toda la colección `admins`.

El API permite crear integrantes a los owners activos. Cada integrante puede editar su propio perfil y cambiar su contraseña con la actual. Una actualización o baja debe conservar al menos un owner activo. Cada integrante conserva su estado activo al editar su propia cuenta. Si el registro es actor de una entrada de auditoría u otra relación declarada, el borrado responde `409` y la app ofrece desactivarlo. Un admin inactivo queda excluido del inicio de sesión.

Cuando una feature agregue una relación a `admins`, registra su colección y campo en `TENANT_REFERENCES`. `ADMIN_REFERENCES` se deriva de ese mapa. La asignación `services.default_coach` ya está registrada. El hook comprueba las colecciones que ya existen y conserva los registros que tengan referencias.

## Auditoría

Añade el nombre de una colección a `AUDITED_COLLECTIONS` en `src/lib/audit-config.ts` y recompila. El hook registra altas, cambios y bajas confirmados. Para las operaciones CRUD de la API, toma el actor de la sesión de `admins`. Las escrituras del sistema tienen actor vacío. Las reglas dan acceso de lectura a los owners activos del negocio auditado. Los superusuarios también pueden consultar la auditoría en el panel de PocketBase. Las escrituras están reservadas al código del servidor, incluso cuando la petición HTTP proviene de un superusuario.

Mantén los nuevos campos sensibles en `SENSITIVE_FIELDS`. Los diffs también excluyen variantes de campos de contraseña, campos sensibles anidados y las marcas de tiempo automáticas del registro. Los cambios de contraseña se registran con la marca `credentials_changed`. Una edición sin cambios auditables no crea una fila.

Para consultar los registros, usa `GET /api/collections/audit_logs/records` con `page`, `perPage`, `sort=-created,-id`, `expand=actor` y filtros por `collection`, `actor` y `created`. La API de registros devuelve `403` a coach, recepción y visitantes. El diff tiene un par `{ from, to }` por campo, con un lado omitido al crear o eliminar. Los registros anteriores a la corrección de la escritura JSON pueden conservar un diff vacío.

## Dashboard operativo

`GET /api/admin/dashboard?days=7` requiere un integrante activo de `admins` (owner, coach o reception). Devuelve `401` sin sesión, `403` para otras cuentas y `400` si `days` no es un entero de 1 a 14. El valor por defecto es 7.

| Campo | Contenido |
| --- | --- |
| `generated_at`, `timezone` | Instante de generación en UTC y zona del negocio |
| `today` | Fecha local `date`, medianoche inicial `start_utc` y medianoche siguiente exclusiva `end_utc`, calculadas por separado para los días de 23 y 25 horas |
| `counts` | `active_clients`, `sessions_today`, `bookings_today`, `waitlisted_today`, `sessions_without_coach` y `sessions_without_bookings` |
| `sessions_today` | Sesiones programadas o completadas del día, ordenadas por inicio, con servicio, coach, duración, cupo, ocupación, espera y disponibilidad |
| `attention` | Entradas `{ session_id, reason, starts_at }` con motivos `no_coach` o `no_bookings` en sesiones programadas desde ahora hasta el final exclusivo de la ventana de `days` días de 24 horas |
| `upcoming_payments` | `null` en el resumen operativo. Los cobros se consultan en `GET /api/admin/payments/due` |

`bookings_today` incluye las reservas `booked`, `attended` y `no_show` de las sesiones del día. La alerta `no_bookings` considera solo las reservas `booked` de su sesión. Los conteos de clientes y reservas no incluyen datos personales de clientes.

## Catálogo

`services` guarda el tipo, cupo, coach por defecto, antelación de cancelación y estado de cada servicio. `plans` guarda precios en centavos de la moneda del negocio, unidades de cobro, sesiones y compromiso. Los admins activos de los tres roles pueden consultar ambas colecciones. El rol `owner` puede crearlas, editarlas, reordenarlas y eliminarlas desde la app.

En desarrollo, `bun run dev` compila antes de iniciar PocketBase. Para arrancar directamente con `./pb serve`, ejecuta primero `bun run build:ts`. La migración del catálogo usa `CATALOG_SEED` de `src/lib/catalog.ts` para inicializar cinco servicios y diez planes. Conserva los registros existentes, incluidos los precios editados. Online Coaching empieza sin planes. Mantén los datos de esta migración como referencia histórica y usa una nueva migración para futuras altas automáticas.

Los hooks permiten un solo plan de primera clase por negocio, con precio cero y unidad `first_visit`. Los demás planes requieren un precio positivo. Al desactivar un servicio, PocketBase desactiva sus planes en la misma transacción y registra el cambio en `audit_logs`. Para volver a ofrecer un plan, activa el servicio y después activa el plan. Si hay dependientes, la API devuelve 400 y recomienda desactivar el registro. Los controles se aplican a las escrituras de la API y del panel `/_/`. Usa `/services` y `/plans` para editar el catálogo con las credenciales habituales de owner.

## Goja y fechas

PocketBase 0.40.5 ejecuta los hooks en Goja. El runtime tiene `Date.UTC`, `toISOString` y métodos `getUTC*`. `Intl` no está disponible y `getTimezoneOffset` depende del entorno del servidor. Los callbacks se ejecutan en contextos aislados. Carga las librerías con ``require(`${__hooks}/lib/archivo`)`` dentro del callback y mantén la lógica pura en `src/lib/`.

`src/lib/tz.ts` calcula las zonas IANA admitidas en Goja. Usa `localToUtc("2026-03-08", "09:00", timezone)` para guardar las horas en UTC y `utcToLocal(isoUtc, timezone)` para obtener el día y la hora local. `localWeekday` acepta una fecha civil o un instante ISO UTC con su zona. `addLocalDays` opera en días civiles y `startOfLocalDay(date, timezone)` devuelve el instante UTC correspondiente a la medianoche local.

## Migraciones

Usa `pb_migrations/<timestamp>_<verbo>_<objeto>.js` con un timestamp en segundos mayor que el de la última migración. Cada archivo declara `migrate(up, down)`. PocketBase aplica las migraciones pendientes al arrancar. Comprueba las reversiones con `./pb migrate down N` y prueba cualquier cambio de esquema con datos temporales.

## Horarios y clases

- `class_templates` contiene la agenda semanal. El seed carga nueve plantillas de Tropical Jump y Group Strength de 60 minutos. Una plantilla activa creada desde administración, o una que se reactive, genera sesiones para las cuatro semanas siguientes.
- `class_sessions` contiene sesiones concretas. El índice parcial de `(template, starts_at)` conserva una sola sesión por franja, incluso si se cancela. Las sesiones `special` y `private` pueden quedar sin plantilla. El personal puede consultar sesiones y owner o reception pueden editarlas. Desde la API de staff, las sesiones se cancelan para conservar el historial.
- `schedule_blocks` contiene rangos inclusivos para todos los servicios. Owner administra los bloqueos y las plantillas. Guardar un bloqueo cancela las sesiones programadas del rango con motivo `Bloqueo: <título>`. Quitar el bloqueo conserva las cancelaciones.

`starts_at` representa un instante UTC. PocketBase devuelve fechas con espacio como separador y sufijo `Z`. Las rutas reciben ISO UTC con `T` y `Z` para movimientos. `start_time` es `HH:mm` en la zona del negocio. `date_from`, `date_to` y el parámetro `from` son fechas locales `YYYY-MM-DD`.

El servidor aplica las reglas de cambio de hora de EE. UU. vigentes desde 2007. En marzo adelanta una hora inexistente por el salto. En noviembre usa la primera ocurrencia de una hora repetida. El cron `jq_generate_sessions` corre diariamente a las 07:00 UTC y genera cuatro semanas desde hoy en Miramar. Puede ejecutarse desde Ajustes → Crons en PocketBase. [Cron de PocketBase](https://pocketbase.io/docs/js-jobs-scheduling/)

### Rutas administrativas

| POST | Rol | Cuerpo y resultado |
| --- | --- | --- |
| `/api/admin/sessions/generate` | owner | `weeks` entero entre 1 y 12, por defecto 4. `from` opcional, por defecto hoy en Miramar. Devuelve `created`, `skipped_existing`, `skipped_blocked` y `window: { from, to }` con fechas inclusivas. |
| `/api/admin/sessions/{id}/cancel` | owner, reception | `reason` entre 3 y 200 caracteres. Devuelve la sesión cancelada. |
| `/api/admin/sessions/{id}/move` | owner, reception | `starts_at` UTC futuro, `reason` entre 3 y 200 caracteres y `coach` opcional. Devuelve `{ cancelled, created }`. Ambas escrituras ocurren en la misma transacción. |
| `/api/admin/class-templates/{id}/assign-coach` | owner | `coach` es el ID de un owner o coach activo, o `""` para quitar la asignación. `apply_to_future` opcional actualiza las sesiones futuras programadas. Devuelve `{ template, updated_sessions }`. |

Las rutas devuelven `401` sin sesión, `403` si el rol es insuficiente y `404` si el registro indicado no existe. Los datos inválidos devuelven `400` con detalles por campo en `data`. Un movimiento dentro de un bloqueo o que se solapa con otra sesión del coach devuelve `400` en `starts_at`. Cancelar o mover una sesión ya cancelada o completada devuelve `400` con el mensaje «La sesión no se puede cancelar».

### Evento de cancelación para reservas y comunicaciones

La transición de `scheduled` a `cancelled` se observa después de guardar la sesión con éxito, incluso si el origen fue un movimiento, un bloqueo o una edición directa. Cada consumidor puede registrar su propio hook. El siguiente ejemplo puede guardarse en `pb_hooks/` como archivo `.pb.js` tras compilar las librerías. [Hooks de PocketBase](https://pocketbase.io/docs/js-event-hooks/)

```js
onRecordAfterUpdateSuccess((e) => {
  const { isCancellationTransition } = require(`${__hooks}/lib/session-rules`);
  const session = e.record;
  if (isCancellationTransition(session.original().get("status"), session.get("status"))) {
    e.app.logger().info("Sesión cancelada",
      "id", session.id,
      "service", session.getString("service"),
      "starts_at", session.getString("starts_at"),
      "cancel_reason", session.getString("cancel_reason"),
      "template", session.getString("template"));
  }
  return e.next();
}, "class_sessions");
```

La cascada de reservas se guarda en la misma transacción que la cancelación de la sesión. Los hooks de éxito observan la sesión y las reservas ya canceladas. La feature 018 puede observar la sesión para enviar `class_cancelled`.

## Agenda de Personal Training y sesiones especiales

`coach_availability` guarda tramos semanales con `coach`, `weekday` (0 es domingo), `start_time` y `end_time` en formato local `HH:mm` de Miramar. Los admins activos pueden consultar los tramos. Owner puede editarlos y cada coach puede editar los propios. Los tramos de un mismo coach y día admiten bordes contiguos y deben tener fin posterior al inicio. Los cambios se auditan y desactivar al coach conserva sus tramos.

Una sesión privada usa un servicio personal activo y un coach activo con rol coach u owner. Toda su duración debe quedar dentro de un único tramo. El servidor compara el intervalo con las sesiones programadas del coach y con los bloqueos de las fechas locales cubiertas. Una sesión puede empezar justo cuando termina otra.

`POST /api/admin/sessions/private` está disponible para owner, reception y coaches que se asignen a sí mismos. El cuerpo incluye `service`, `coach`, `starts_at` como ISO UTC, `duration_min` de 15 a 240 y `client_ids` con uno o dos IDs distintos. Puede incluir `notes` y `capacity`. Un cliente ocupa un cupo por defecto y una pareja requiere dos. Para abrir dos cupos, cada cliente invitado debe tener una membresía activa con `plans.partner = true` del servicio que cubra la fecha. El requisito también se aplica al reservar el cupo restante.

La ruta devuelve `{ session, bookings }` en HTTP 200. Guarda la sesión y todas las reservas `booked` en la misma transacción. Owner y reception pueden enviar `overrides: { "<id del cliente>": { "override_note": "Motivo" } }` cuando exista una excepción de elegibilidad. La reserva compromete el cupo y los créditos según 013. El movimiento de consumo se registra al marcar asistencia o cuando se aplica la política de cancelación tardía o ausencia.

Los errores de dominio se incluyen en `data.code.code`. Entre ellos están `coach_conflict`, `block_conflict`, `outside_availability`, `invalid_capacity`, `partner_required` y los códigos de elegibilidad de 013. `data.conflict_id.code` identifica la sesión o el bloqueo que causa el conflicto. `data.client.code` identifica al cliente cuya elegibilidad falló. Una sesión privada programada con el mismo coach, servicio e instante devuelve HTTP 409. Para consultar la elegibilidad antes de crearla, usa `GET /api/admin/memberships/eligibility` con `client`, `service` y `starts_at`. La respuesta incluye `partner`.

Para una especial, owner o reception guarda en `class_sessions` con `kind = special`, `title` de hasta 120 caracteres, un servicio y capacidad de al menos un cupo. El coach es opcional. Cuando se asigna, se comprueban los choques de horario y bloqueos. Las especiales admiten reservas sin membresía y quedan exentas de créditos. Ambos tipos se crean sin plantilla. Se conservan las rutas de cancelación y el historial de reservas. Para cambiar el horario de una privada con reservas, cancela la sesión y agenda otra desde el flujo privado.

## Clientes

La colección `clients` se usa mediante la API estándar de PocketBase. Los admins activos pueden listar, consultar, crear y editar. Solo un `owner` activo puede eliminar o cambiar `free_class_used` por HTTP. Los hooks de reservas pueden marcarla mediante `app.save`, que ejecuta los hooks de modelo y omite los hooks de petición.

El email es opcional. Se guarda en minúsculas y el índice parcial exige unicidad cuando hay un valor. Se aceptan teléfonos compartidos y se guardan en E.164, con `+1` por defecto para números estadounidenses sin prefijo. El estado inicial es `active` y, si se omite `joined_on`, se usa el inicio del día del negocio. Desde `inactive` se puede volver a `active` antes de pasar a `paused`.

### Evaluación inicial

`assessment` acepta JSON con `version: 1`. Una evaluación puede omitirse. Los bloques y sus campos son opcionales. Cuando se incluyen, se aplican estas validaciones.

| Campo o bloque | Contenido |
| --- | --- |
| `completed_on` y `assessed_by` | Fecha civil válida `YYYY-MM-DD` e ID del integrante que evaluó |
| `medical` | `conditions`, `injuries`, `medications` como texto y `parq_cleared` booleano |
| `lifestyle` | `activity_level` admite `sedentary`, `light`, `moderate` o `high`. `sleep_hours` admite 0–24, `stress_level` enteros de 1–5 y `nutrition_notes` texto |
| `training` | `experience` admite `none`, `beginner`, `intermediate` o `advanced`. `days_per_week` admite enteros de 0–7. `preferred_times` y `equipment_access` son texto |
| `measurements` | `weight_lb`, `height_in` y `waist_in` son positivos. `body_fat_pct` es positivo y como máximo 100 |
| `goals_detail` y `notes` | Texto |

El API responde `400` con `data.assessment` para claves desconocidas o valores inválidos. Las notas, la evaluación y sus diffs de auditoría se manejan en el panel administrativo. El hook general registra altas, ediciones y bajas confirmadas en `audit_logs` con el actor de la petición.

### Relaciones con clientes

`bookings.client` enlaza a `clients` sin borrado en cascada. `memberships.client` sigue la misma regla. `payments.client` también usa una relación sin borrado en cascada. `coaching_programs.client` sigue la misma regla. Un cliente referenciado en `bookings`, `memberships`, `payments` o `coaching_programs` devuelve `409` al intentar borrarlo. Usa `status: "inactive"` para conservar el historial.

Queda pendiente decidir si se necesita importar clientes por CSV o crear un endpoint de alta externa. La feature 010 habilita el alta manual desde el panel.

## Reservas y asistencia

`bookings` relaciona una sesión y un cliente con un índice único sobre `(session, client)`. Los admins activos pueden listar, consultar, crear y actualizar. El borrado queda reservado a owner. Una reserva con movimientos de crédito se conserva y se corrige mediante cambios de estado. `marked_by` identifica a quien cancela o marca asistencia y `source` es `admin`.

En `POST /api/collections/bookings/records`, envía `session` y `client`. El servidor calcula el estado y la posición. Si el mismo cliente reserva de nuevo después de una cancelación, el POST reactiva el registro con el mismo ID. El cliente debe estar activo o en pausa y la sesión debe estar programada y ser futura.

En `PATCH /api/collections/bookings/records/{id}`, envía `status` con `cancelled`, `attended` o `no_show`. En una cancelación tardía, `override_note` con un motivo evita la penalización. Si envías `override: true`, el motivo es obligatorio. Desde la hora de inicio se puede marcar asistencia. Para hacerlo antes, o para corregir un resultado anterior, se exige una nota. Owner y reception también pueden corregir una asistencia, ausencia o cancelación tardía a `cancelled` con una nota.

| Cambio | Evento de `classifyTransition` |
| --- | --- |
| Alta o reactivación con cupo → `booked` | `booking.created` |
| Alta o reactivación sin cupo → `waitlisted` | `booking.waitlisted` |
| `waitlisted` → `booked` al liberarse un cupo | `booking.promoted` |
| `booked` o `waitlisted` → `cancelled` | `booking.cancelled` |
| `booked` → `late_cancelled` después del límite, sin excepción | `booking.late_cancelled` |
| `booked` o `no_show` → `attended` | `booking.attended` |
| `booked` o `attended` → `no_show` | `booking.no_show` |
| Cancelación por la sesión → `cancelled`, con `override_note = "session_cancelled"` | `booking.cancelled_by_session` |

Cuenta como ocupado cada registro en `booked`, `attended` o `no_show`. La espera se ordena por posición. Al cancelar una reserva confirmada se promueve la primera de la lista cuando hay cupo. La cancelación de la sesión cancela a todos los inscritos y a quienes esperan, sin promociones. Los cambios quedan en `audit_logs` con el evento en el resumen y el actor de la operación cuando corresponde.

Los consumidores pueden observar `onRecordAfterCreateSuccess` y `onRecordAfterUpdateSuccess` de `bookings`. Dentro del callback, carga `lib/booking-rules` y `lib/booking-store` con `require`. En altas, llama a `classifyTransition(undefined, bookingData(e.record))`. En actualizaciones, compara `bookingData(e.record.original())` con `bookingData(e.record)`. Un cambio de posición sin transición de estado devuelve `undefined`. Las features 015 y 018 pueden usar este contrato. El libro mayor de créditos se reconcilia dentro de la transacción de la reserva.

### Primera clase gratis

`use_free_class: true` en el POST usa el plan de primera visita del servicio. Si el cliente aún puede recibirlo y no tiene una membresía de primera visita, la transacción crea una. La reserva guarda `free_class = true` y el cliente queda marcado en `free_class_used` al asistir. Una cancelación a tiempo libera el crédito comprometido. La cancelación tardía y la ausencia descuentan el crédito. Las reservas gratis anteriores a la migración conservan las reglas de liberación de su marca.

### Disponibilidad

| GET | Resultado |
| --- | --- |
| `/api/admin/sessions/{id}/availability` | Disponibilidad de una sesión. Devuelve `404` si no existe. |
| `/api/admin/sessions/availability?from=&to=` | Disponibilidad de las sesiones programadas en un rango `[from, to)` de hasta 62 días. Acepta fechas locales `YYYY-MM-DD` de Miramar o instantes ISO UTC. Un rango inválido devuelve `400`. |

Ambas rutas requieren un admin activo. Devuelven `401` sin autenticación. Cada entrada contiene `session`, `capacity`, `booked`, `waitlisted`, `spots_left`, `availability` y `cancellation_deadline` en UTC. El valor de `availability` es `full` con cero cupos, `almost` con uno o dos, y `available` con tres o más. El límite para cancelar sin penalización se calcula restando `services.cancellation_hours` a `starts_at`. El instante exacto del límite cuenta como cancelación a tiempo.


## Membresías y créditos

`memberships` relaciona un cliente con un plan. Puede haber una sola membresía activa o pausada por cliente y plan. `credit_movements` es un historial inmutable con los motivos `grant`, `attend`, `late_cancel`, `adjust` y `expire`. Su suma es `credits_balance`. Las colecciones se consultan con un admin activo. Las escrituras normales pasan por rutas y hooks, que actualizan el saldo y registran auditoría dentro de las transacciones de gestión.

### Gestión y elegibilidad

Todas las rutas de la tabla tienen el prefijo `/api/admin/memberships`. Owner y reception gestionan membresías. Coach puede consultar las colecciones y la elegibilidad. Las acciones devuelven `{ membership, movement }`. `movement` vale `null` si la acción no produjo un movimiento principal. Los códigos de dominio se incluyen en `data.code.code` del error de PocketBase.

| Método y ruta | Datos y efecto |
| --- | --- |
| `POST /assign` | `client`, `plan`, `starts_on` opcional y `notes` opcionales. Otorga los créditos del primer periodo. |
| `POST /{id}/renew` | `notes` opcionales. Abre otro periodo y otorga sus créditos. |
| `POST /{id}/pause` | `note` obligatoria. Guarda el día de inicio de la pausa. |
| `POST /{id}/resume` | Desplaza el cierre por los días pausados. |
| `POST /{id}/cancel` | `note` obligatoria. Fija `ended_on`, expira el saldo positivo y registra la cancelación anticipada cuando corresponde. |
| `POST /{id}/adjust` | `delta` entero distinto de cero y `note` obligatoria. |
| `GET /eligibility?client=&session=` | Devuelve `{ allowed, code, available }`. `available` vale `null` cuando no hay un límite de créditos aplicable. |
| `POST /run-daily` | Solo owner. Devuelve el total de créditos expirados y la cantidad de membresías vencidas en `{ expiredCredits, expiredMemberships }`. |

Cada periodo abarca 28 días inclusivos en la fecha civil en la zona del negocio. Renovar dentro de la gracia abre el periodo siguiente al cierre anterior. Si la membresía venció o se agotó la gracia, el periodo empieza el día de la renovación y `ended_on` se vacía. El compromiso se copia del plan al asignarlo. `periods_paid` cuenta los periodos otorgados y `auto_renew` empieza en `false`.

Un plan de cuatro semanas otorga `sessions` créditos por periodo. Con cero sesiones es ilimitado y conserva el límite semanal si tiene `per_week`. La semana local empieza el lunes. Una clase suelta otorga un crédito por compra. Un plan de primera visita otorga un solo crédito por cliente y no se renueva.

Las sesiones regulares y privadas de servicios grupales y personales exigen una membresía activa cuyo plan cubra la fecha y el servicio. El disponible descuenta las reservas confirmadas futuras que ya comprometen créditos del periodo. La lista de espera se valida al ingresar. Las sesiones especiales y los servicios en línea quedan exentos. La elegibilidad distingue `no_credits`, `weekly_limit`, `no_membership` y `membership_not_active`.

Owner y reception pueden crear una reserva con `override_note` no vacía cuando falla la validación de créditos. `bookings.membership` conserva la membresía elegida. Si la reserva se imputa a un plan con créditos, al asistir se descuenta un crédito, aunque el saldo quede negativo. La cancelación tardía y la ausencia generan `late_cancel`. Una corrección a un estado sin cobro registra `adjust` por la diferencia. Los guardados repetidos conservan el mismo cargo.

`memberships_daily` corre a las 09:00 UTC. En el primer procesamiento tras el cierre expira el saldo positivo del periodo. La membresía permanece activa durante siete días de gracia y pasa a `expired` el día ocho. El cron conserva el saldo negativo y evita duplicar la expiración si se repite.

El hook de pagos usa `periods_paid` y `current_period_start` para generar un cobro pendiente por ciclo. La feature 015 puede reutilizar `checkEligibility(app, clientId, session)` del servicio. La feature 016 puede enlazar sus programas con `memberships`.

`scripts/verify-api.sh` verifica en una base temporal la asignación, la renovación, los ajustes y su rollback, la auditoría, las reservas con y sin excepción, el filtro por plan activo y el cron.

## Online Coaching

`coaching_programs` enlaza al cliente, al coach responsable y a la membresía que financia el programa. El alta exige una membresía activa del mismo cliente y un plan de un servicio con `kind = online`. Crea el plan como `per_4_weeks` con 2, 3 o 4 periodos de compromiso para 8, 12 o 16 semanas. El catálogo inicial no incluye un plan online. El índice parcial permite un único programa activo o pausado por cliente y conserva los finalizados.

El servidor deriva `renews_on` del fin del periodo vigente más un día. Una pausa o reanudación de la membresía sincroniza el estado y una cancelación finaliza el programa. La membresía y el programa se actualizan en la misma transacción. Una membresía vencida genera la alerta correspondiente y conserva el estado del programa. Al alcanzar el fin previsto sin cobertura posterior se muestra **Por finalizar**. Los programas finalizados quedan cerrados.

`coaching_checkins` guarda la fecha civil de Miramar, adherencia entera de 1 a 5, notas y autor. El servidor rechaza fechas futuras y check-ins de programas finalizados. El staff activo puede consultar ambas colecciones. Owner y reception gestionan programas y coach gestiona los que tiene asignados. Owner y el coach asignado registran check-ins. El borrado está reservado a owner y ambas colecciones se auditan.

`src/lib/coaching.ts` calcula semana, fin previsto, alertas y adherencia. La cadencia semanal alerta a partir del octavo día en programas activos. El promedio toma los últimos cuatro check-ins y la tendencia los compara con hasta cuatro anteriores. `scripts/verify-api.sh` comprueba el ciclo de migraciones, la elegibilidad, la escritura por rol, la validación, la sincronización y la auditoría con una base temporal.

### Después

La entrega de planes de entrenamiento y nutrición, el portal del cliente, las fotos y las medidas de progreso quedan para una entrega posterior.

## Pagos y recibos

`payments` conserva cobros manuales y de membresía en centavos de la moneda del negocio. Los admins activos con rol `owner` o `reception` pueden consultar los registros de `payments` y usar las rutas de cobro. Las escrituras directas por la API de registros quedan cerradas, incluso para superusuarios. El historial conserva las referencias al cliente, a quien registró el cobro y a quien lo anuló.

| Ruta | Operación |
| --- | --- |
| `POST /api/admin/payments` | Registra un cobro con `client`, `amount_cents` y `status` (`pending` o `paid`). Un pendiente exige `due_on`; un pagado exige `method`. Acepta `membership`, `plan`, `paid_at` y `note` cuando corresponda. |
| `POST /api/admin/payments/{id}/pay` | Pasa un pendiente a pagado con `method` y, opcionalmente, `paid_at` y `note`. |
| `POST /api/admin/payments/{id}/void` | Anula un pendiente o pagado con un `reason` obligatorio. Conserva el importe, el método y el recibo, y registra motivo, fecha y autor. |
| `GET /api/admin/payments/due?days=7&limit=50` | Devuelve `overdue`, `upcoming`, `renewals` y `totals`. `days` admite de 1 a 60 y `limit` de 1 a 500 entradas por sección. Los totales se calculan antes de aplicar el límite. |

Los métodos son `cash`, `zelle`, `card` y `other`. Las fechas de cobro y vencimiento son días civiles en formato `YYYY-MM-DD` de Miramar. Si se omite `paid_at`, se usa la fecha local actual. Los datos inválidos devuelven `400`, los roles sin acceso `403`, los registros inexistentes `404` y las transiciones incompatibles `409`.

`receipt_sequences` mantiene un contador por negocio y año de `paid_at`. El servicio incrementa el contador, guarda el pago con `PREFIJO-AAAA-NNNNNN` y registra la operación de auditoría en la misma transacción. Un fallo revierte el incremento. Un cobro pendiente recibe número al pagarse. Un recibo anulado sigue visible con su número original.

Al asignar o renovar una membresía, el hook usa el precio del plan y el inicio del periodo para generar un pendiente con un `period_index` único entre cobros vigentes. Los planes por clase generan un único cobro y los planes gratuitos quedan excluidos. Si el cobro se anula, un guardado posterior de la membresía por staff puede reponerlo. La generación automática se atribuye al integrante que guardó la membresía. Las membresías históricas se pueden cobrar manualmente.

El reporte cuenta como vencidos los pendientes con fecha anterior a hoy. La ventana incluye hoy y el día límite. Las alertas incluyen membresías activas con cierre próximo o pasado e indican si hay un cobro pendiente para el siguiente periodo. La mora se muestra al staff y las reglas de reserva y membresía siguen operando por separado.

### Punto de extensión de la pasarela de pago

Una integración futura añadiría `provider` y `external_ref` al modelo y una ruta webhook que verifique la firma del proveedor. Después de verificar la notificación e identificar el cobro, el webhook llamaría a `settlePayment(app, paymentId, { method, paidAt, recordedBy, note })` para usar la misma transacción, numeración y auditoría. La integración con proveedor, el webhook y la conciliación quedan fuera de esta entrega.

`scripts/verify-api.sh` aplica, revierte y reaplica las migraciones de pagos en una base temporal. También comprueba los índices parciales, permisos, dos liquidaciones concurrentes, rollback del contador, reinicio anual, anulación, cobros por ciclo y vencimientos.

## Reportes

Las rutas de solo lectura devuelven datos agregados y no incluyen nombres, correos ni teléfonos de clientes. Requieren un registro activo de `admins`.

| Ruta GET | Owner | Coach | Recepción | Campos adicionales a `range` |
| --- | --- | --- | --- | --- |
| `/api/admin/reports/occupancy` | Sí | Sí | Sí | `totals`, `by_service`, `by_class` |
| `/api/admin/reports/attendance` | Sí | Sí | Sí | `totals`, `by_service`, `by_day` |
| `/api/admin/reports/revenue` | Sí | — | — | `totals`, `by_plan`, `by_service`, `by_period` |
| `/api/admin/reports/retention` | Sí | Sí | Sí | `totals`, `by_plan`, `by_period` |

- `from` y `to` son fechas inclusivas en formato `YYYY-MM-DD`. El máximo es de 366 días. `range` devuelve `from`, `to`, `timezone` del negocio, `start_utc` y `end_utc`. El primer límite UTC es inclusivo y el segundo corresponde a la medianoche local posterior a `to`, excluida. El cálculo respeta el horario de verano.
- `service` acepta un slug existente y es opcional en ocupación, asistencia e ingresos.
- `group_by` admite `day`, `week` y `month` en ingresos y retención. Por defecto usa `month`. Una semana comienza el domingo y se identifica por esa fecha. La agrupación diaria admite hasta 92 días. Los periodos sin altas, bajas o cobros aparecen con cero en esos campos. El saldo de membresías se arrastra al periodo siguiente.
- La API devuelve `400` ante parámetros inválidos, `401` si falta sesión y `403` si el rol o el estado del registro impiden el acceso.

**Ocupación.** `occupancy_rate` divide las reservas `booked`, `attended` y `no_show` entre los cupos. Las clases canceladas se excluyen. `by_class` incluye la lista de espera, la fecha y hora locales y el nombre del coach.

**Asistencia.** `no_show_rate` y `attendance_rate` dividen las inasistencias y las asistencias, respectivamente, entre `attended + no_show`. Los conteos muestran por separado las reservas pendientes de asistencia y las cancelaciones ordinarias y tardías. Ambas tasas devuelven 0 si el denominador es 0. La tasa de ocupación aplica la misma regla.

**Ingresos.** Los importes son centavos enteros de la moneda del negocio. El reporte expone `currency` y rechaza importes en otra moneda. `paid_cents` usa `paid_at`. `pending_cents` y `void_cents` usan la fecha local de vencimiento. Si un pago anulado carece de vencimiento, usa su fecha local de anulación. Los pagos sin plan se agrupan en «Sin plan». `by_period` incluye solo importes y conteos de pagos cobrados.

**Retención.** Las altas se fechan por `starts_on` y las bajas de membresías canceladas o expiradas por `ended_on`. Las pausas se incluyen en el saldo. `churn_rate = churned / active_start` y `retention_rate = 1 - churn_rate`. Si `active_start` es 0, las tasas son 0 y 1, respectivamente.

`../scripts/verify-api.sh` verifica los permisos, filtros y contratos de respuesta con datos de ejemplo, incluido un día de 23 horas.

## Comunicaciones del servicio

Las comunicaciones cubren reservas, clases, cobros y renovaciones. No incluyen marketing, boletines ni seguimiento comercial.

### Configurar el correo

En el panel de PocketBase, abre **Ajustes → Correo**, habilita SMTP y guarda el servidor, puerto, credenciales y dirección de envío. Los mensajes usan el nombre del negocio como remitente visible y su correo de contacto como dirección de respuesta, si es válido. Envía una prueba como owner con `POST /api/admin/messages/test` y el cuerpo `{"key":"booking_confirmed","locale":"es"}`. PocketBase entrega la prueba al correo del owner autenticado.

| Variable del proceso de PocketBase | Valor por defecto | Uso |
| --- | --- | --- |
| `MESSAGES_REMINDER_HOURS` | `24` | Anticipación del recordatorio de clase, en horas |
| `MESSAGES_DUE_DAYS_BEFORE` | `3` | Días de anticipación del aviso de cobro |
| `MESSAGES_RENEWAL_DAYS_BEFORE` | `5` | Días de anticipación del aviso de renovación |

El cron de recordatorios corre cada 15 minutos. Los avisos de cobro y renovación corren cada hora y envían a las 09:00 locales de cada negocio activo. Para limitar el uso de las rutas, habilita el limitador de PocketBase en Ajustes y añade reglas para `POST /api/admin/messages/` o para cada ruta.

### Plantillas e historial

Las seis plantillas se inicializan activas en español e inglés. `clients.locale` determina el idioma y los clientes anteriores usan español. Si falta la plantilla del idioma preferido se busca la del otro idioma. Una plantilla desactivada suprime el envío en su idioma. Las ediciones quedan en auditoría y requieren el rol owner.

| Clave | Variables específicas |
| --- | --- |
| `booking_confirmed`, `class_reminder`, `waitlist_promoted` | `class_name`, `class_date`, `class_time`, `coach_name` |
| `class_cancelled` | `class_name`, `class_date`, `class_time`, `cancel_reason` |
| `payment_due` | `plan_name`, `amount`, `due_date` |
| `membership_renewal` | `plan_name`, `period_end`, `amount` |
| `manual` | `client_first_name`, `studio_name`, `class_name`, `class_date`, `class_time` |

Las seis plantillas automáticas también admiten `client_first_name`, `studio_name` y `studio_phone`. Usa la sintaxis `{{nombre}}` en texto plano. La API valida las variables y genera HTML escapado. Los importes se muestran en dólares estadounidenses y las fechas de clase usan la hora de Miramar.

Los clientes activos y en pausa pueden recibir correo si su dirección es válida. Los clientes inactivos o sin dirección válida se omiten. El motor registra el resultado, intentos y un error genérico en `message_logs`. Ante un fallo automático, programa los reintentos a los 5 y 30 minutos después del intento previo. El cron revisa la cola cada diez minutos y el máximo es de tres intentos totales. Al reintentar se verifica que el aviso siga vigente y se reconstruye el contexto a partir de la sesión o del vencimiento. La clave de deduplicación protege frente a ejecuciones concurrentes y crons repetidos. Si el proceso muere después de que SMTP acepta el correo y antes de registrar el resultado, SMTP y SQLite no pueden confirmar el envío en una transacción común.

El equipo activo puede previsualizar mensajes, consultar el historial y enviar un mensaje manual a hasta 200 inscritos de una clase próxima. Cada destinatario elegible de un mensaje manual tiene un intento. Su texto se mantiene en memoria durante la solicitud y no se guarda en el historial.

Para añadir SMS en el futuro, implementa `MessageChannel` y registra el canal en `src/lib/message-send.ts`. Añade el valor al campo `message_logs.channel` con una migración y define la elegibilidad y el transporte para ese canal. El canal actual es correo electrónico.

`scripts/verify-api.sh` comprueba los flujos con una instancia temporal de PocketBase y un SMTP de captura en localhost. La captura permite cotejar contenido e idioma sin enviar a una dirección real. Se puede omitir con `JQ_VERIFY_SMTP_CAPTURE=0`.

## Catálogo y horario públicos

Las dos rutas son de solo lectura y exigen la cabecera `X-Business-Key`. El JSON tiene `version: 2` y expone el objeto público `business` con nombre, ciudad, logo, moneda y zona. El owner genera y rota la clave en **Ajustes → Integración** o con `POST /api/admin/business/public-key`. La respuesta de rotación muestra la clave completa una vez.

| Ruta GET | Contenido |
| --- | --- |
| `/api/public/catalog` | Servicios y planes activos del negocio, moneda, precios en centavos y horarios semanales. |
| `/api/public/schedule?week=YYYY-MM-DD` | Sesiones públicas programadas, horas locales, capacidad, cupos y estado. |

`week` se convierte al domingo de su semana. Una fecha omitida o anterior usa la semana actual. Las fechas inválidas y semanas fuera de rango devuelven `400`. Las claves ausentes, inválidas, rotadas o de un negocio inactivo devuelven `401` con el mismo mensaje. Las respuestas omiten identificadores de registros y datos privados.

| Variable del proceso de PocketBase | Valor por defecto | Uso |
| --- | --- | --- |
| `PUBLIC_SCHEDULE_MAX_WEEKS` | `8` | Máximo de semanas futuras. La API lo devuelve en `X-Public-Schedule-Max-Weeks`. |
| `PUBLIC_CATALOG_CACHE_SECONDS` | `30` | TTL de la caché interna por negocio y semana. Cero desactiva la caché. |

Configura los orígenes de cada sitio desde **Ajustes → Integración**. El preflight permite la cabecera de clave para orígenes registrados en alguna integración activa. El GET aplica CORS al negocio de la clave. El parámetro `--origins` de PocketBase sigue controlando otros endpoints. Consulta los [pasos para conectar un sitio](../docs/multi-tenancy.md#conectar-un-sitio-y-rotar-la-clave) y el [contrato HTTP](../features/020-multi-tenancy-business/spec.md#contrato).

`scripts/verify-api.sh` comprueba ambas rutas con claves y orígenes distintos, rotación, campos públicos, cupos, caché y códigos de error. La [guía de Astro](../web/README.md#catálogo-y-horario) documenta la configuración de build y el respaldo.
