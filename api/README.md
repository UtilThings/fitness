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

Desde la raíz, ejecuta `scripts/verify-api.sh`. Instala dependencias con el lockfile, compila y ejecuta las pruebas. Si existe `api/pb`, también comprueba con `curl` que un visitante no puede crear admins ni leer filas de auditoría. Para ello arranca una instancia en un puerto local con un directorio temporal y los limpia al terminar.

## Roles y reglas

`src/lib/rules.ts` define `RULE_STAFF` para admins activos y `RULE_OWNER` para quienes además tienen el rol `owner`. Usa `ruleAnd` y `ruleOr` para combinar cláusulas, `ruleRoles` para limitar el acceso a roles concretos y `ruleOwnerOrSelf` para permitir que cada admin edite su propio registro con campos protegidos.

Las migraciones guardan las reglas como literales. Genera las expresiones con los compositores y copia el resultado en la migración. Las pruebas comprueban que las reglas de `admins` y `audit_logs` coincidan con la librería.

En una base nueva, un superusuario de PocketBase puede crear el primer admin desde `/_/`. Asígnale explícitamente `role = owner` y `active = true`. La colección `_superusers` administra la instancia y sus privilegios son independientes de los roles de la aplicación.

## Equipo: reglas y `ADMIN_REFERENCES`

El API permite crear integrantes a los owners activos. Cada integrante puede editar su propio perfil y cambiar su contraseña con la actual. Una actualización o baja debe conservar al menos un owner activo. Cada integrante conserva su estado activo al editar su propia cuenta. Si el registro es actor de una entrada de auditoría u otra relación declarada, el borrado responde `409` y la app ofrece desactivarlo. Un admin inactivo queda excluido del inicio de sesión.

Cuando una feature agregue una relación a `admins`, añade en el mismo cambio su colección y campo a `ADMIN_REFERENCES` en `src/lib/team-guards.ts`. Por ejemplo, al crear `services.default_coach`, agrega `{ collection: "services", field: "default_coach" }`. El hook comprueba las colecciones que ya existen y conserva los registros que tengan referencias.

## Auditoría

Añade el nombre de una colección a `AUDITED_COLLECTIONS` en `src/lib/audit-config.ts` y recompila. El hook registra altas, cambios y bajas confirmados. Para las operaciones CRUD de la API, toma el actor de la sesión de `admins`. Las escrituras del sistema tienen actor vacío. Las reglas dan acceso de lectura a los owners activos. Los superusuarios también pueden consultar la auditoría en el panel de PocketBase. Las escrituras están reservadas al código del servidor, incluso cuando la petición HTTP proviene de un superusuario.

Mantén los nuevos campos sensibles en `SENSITIVE_FIELDS`. Los diffs también excluyen variantes de campos de contraseña, campos sensibles anidados y las marcas de tiempo automáticas del registro. Los cambios de contraseña se registran con la marca `credentials_changed`. Una edición sin cambios auditables no crea una fila.

## Goja y fechas

PocketBase 0.40.5 ejecuta los hooks en Goja. El runtime tiene `Date.UTC`, `toISOString` y métodos `getUTC*`. `Intl` no está disponible y `getTimezoneOffset` depende del entorno del servidor. Los callbacks se ejecutan en contextos aislados. Carga las librerías con ``require(`${__hooks}/lib/archivo`)`` dentro del callback y mantén la lógica pura en `src/lib/`.

`src/lib/tz.ts` aplica las reglas actuales de horario de verano de `America/New_York`. Usa `localToUtc("2026-03-08", "09:00")` para guardar las horas en UTC y `utcToLocal(isoUtc)` para obtener el día y la hora local. `localWeekday` acepta una fecha local o un instante ISO UTC. `addLocalDays` opera en días civiles y `startOfLocalDay` devuelve la medianoche local como ISO UTC. Una hora inexistente en marzo se desplaza una hora hacia delante. En noviembre, una hora ambigua se interpreta como su primera ocurrencia.

## Migraciones

Usa `pb_migrations/<timestamp>_<verbo>_<objeto>.js` con un timestamp en segundos mayor que el de la última migración. Cada archivo declara `migrate(up, down)`. PocketBase aplica las migraciones pendientes al arrancar. Comprueba las reversiones con `./pb migrate down N` y prueba cualquier cambio de esquema con datos temporales.
