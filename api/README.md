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

Desde la raíz, ejecuta `scripts/verify-api.sh`. Instala dependencias con el lockfile, compila y ejecuta las pruebas. Si existe `api/pb`, arranca PocketBase en localhost con datos temporales. Comprueba los permisos, la auditoría y el catálogo antes y después de reiniciar la instancia.

## Roles y reglas

`src/lib/rules.ts` define `RULE_STAFF` para admins activos y `RULE_OWNER` para quienes además tienen el rol `owner`. Usa `ruleAnd` y `ruleOr` para combinar cláusulas, `ruleRoles` para limitar el acceso a roles concretos y `ruleOwnerOrSelf` para permitir que cada admin edite su propio registro con campos protegidos.

Las migraciones guardan las reglas como literales. Genera las expresiones con los compositores y copia el resultado en la migración. Las pruebas comprueban que las reglas de `admins` y `audit_logs` coincidan con la librería.

En una base nueva, un superusuario de PocketBase puede crear el primer admin desde `/_/`. Asígnale explícitamente `role = owner` y `active = true`. La colección `_superusers` administra la instancia y sus privilegios son independientes de los roles de la aplicación.

## Equipo: reglas y `ADMIN_REFERENCES`

El API permite crear integrantes a los owners activos. Cada integrante puede editar su propio perfil y cambiar su contraseña con la actual. Una actualización o baja debe conservar al menos un owner activo. Cada integrante conserva su estado activo al editar su propia cuenta. Si el registro es actor de una entrada de auditoría u otra relación declarada, el borrado responde `409` y la app ofrece desactivarlo. Un admin inactivo queda excluido del inicio de sesión.

Cuando una feature agregue una relación a `admins`, añade en el mismo cambio su colección y campo a `ADMIN_REFERENCES` en `src/lib/team-guards.ts`. La asignación `services.default_coach` ya está registrada. El hook comprueba las colecciones que ya existen y conserva los registros que tengan referencias.

## Auditoría

Añade el nombre de una colección a `AUDITED_COLLECTIONS` en `src/lib/audit-config.ts` y recompila. El hook registra altas, cambios y bajas confirmados. Para las operaciones CRUD de la API, toma el actor de la sesión de `admins`. Las escrituras del sistema tienen actor vacío. Las reglas dan acceso de lectura a los owners activos. Los superusuarios también pueden consultar la auditoría en el panel de PocketBase. Las escrituras están reservadas al código del servidor, incluso cuando la petición HTTP proviene de un superusuario.

Mantén los nuevos campos sensibles en `SENSITIVE_FIELDS`. Los diffs también excluyen variantes de campos de contraseña, campos sensibles anidados y las marcas de tiempo automáticas del registro. Los cambios de contraseña se registran con la marca `credentials_changed`. Una edición sin cambios auditables no crea una fila.

## Catálogo

`services` guarda el tipo, cupo, coach por defecto, antelación de cancelación y estado de cada servicio. `plans` guarda precios en centavos USD, unidades de cobro, sesiones y compromiso. Los admins activos de los tres roles pueden consultar ambas colecciones. El rol `owner` puede crearlas, editarlas, reordenarlas y eliminarlas desde la app.

En desarrollo, `bun run dev` compila antes de iniciar PocketBase. Para arrancar directamente con `./pb serve`, ejecuta primero `bun run build:ts`. La migración del catálogo usa `CATALOG_SEED` de `src/lib/catalog.ts` para inicializar cinco servicios y diez planes. Conserva los registros existentes, incluidos los precios editados. Online Coaching empieza sin planes. Mantén los datos de esta migración como referencia histórica y usa una nueva migración para futuras altas automáticas.

Los hooks permiten un solo plan de primera clase, con precio cero y unidad `first_visit`. Los demás planes requieren un precio positivo. Al desactivar un servicio, PocketBase desactiva sus planes en la misma transacción y registra el cambio en `audit_logs`. Para volver a ofrecer un plan, activa el servicio y después activa el plan. Si hay dependientes, la API devuelve 400 y recomienda desactivar el registro. Los controles se aplican a las escrituras de la API y del panel `/_/`. Usa `/services` y `/plans` para editar el catálogo con las credenciales habituales de owner.

## Goja y fechas

PocketBase 0.40.5 ejecuta los hooks en Goja. El runtime tiene `Date.UTC`, `toISOString` y métodos `getUTC*`. `Intl` no está disponible y `getTimezoneOffset` depende del entorno del servidor. Los callbacks se ejecutan en contextos aislados. Carga las librerías con ``require(`${__hooks}/lib/archivo`)`` dentro del callback y mantén la lógica pura en `src/lib/`.

`src/lib/tz.ts` aplica las reglas actuales de horario de verano de `America/New_York`. Usa `localToUtc("2026-03-08", "09:00")` para guardar las horas en UTC y `utcToLocal(isoUtc)` para obtener el día y la hora local. `localWeekday` acepta una fecha local o un instante ISO UTC. `addLocalDays` opera en días civiles y `startOfLocalDay` devuelve la medianoche local como ISO UTC. Una hora inexistente en marzo se desplaza una hora hacia delante. En noviembre, una hora ambigua se interpreta como su primera ocurrencia.

## Migraciones

Usa `pb_migrations/<timestamp>_<verbo>_<objeto>.js` con un timestamp en segundos mayor que el de la última migración. Cada archivo declara `migrate(up, down)`. PocketBase aplica las migraciones pendientes al arrancar. Comprueba las reversiones con `./pb migrate down N` y prueba cualquier cambio de esquema con datos temporales.

## Horarios y clases

- `class_templates` contiene la agenda semanal. El seed carga nueve plantillas de Tropical Jump y Group Strength de 60 minutos. Una plantilla activa creada desde administración, o una que se reactive, genera sesiones para las cuatro semanas siguientes.
- `class_sessions` contiene sesiones concretas. El índice parcial de `(template, starts_at)` conserva una sola sesión por franja, incluso si se cancela. Las sesiones `special` y `private` pueden quedar sin plantilla. El personal puede consultar sesiones y owner o reception pueden editarlas. Desde la API de staff, las sesiones se cancelan para conservar el historial.
- `schedule_blocks` contiene rangos inclusivos para todos los servicios. Owner administra los bloqueos y las plantillas. Guardar un bloqueo cancela las sesiones programadas del rango con motivo `Bloqueo: <título>`. Quitar el bloqueo conserva las cancelaciones.

`starts_at` representa un instante UTC. PocketBase devuelve fechas con espacio como separador y sufijo `Z`. Las rutas reciben ISO UTC con `T` y `Z` para movimientos. `start_time` es `HH:mm` de Miramar (`America/New_York`). `date_from`, `date_to` y el parámetro `from` son fechas locales `YYYY-MM-DD`.

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

La feature 011 consume el evento para cancelar reservas y gestionar la lista de espera. La feature 018 lo consume para enviar `class_cancelled`.
