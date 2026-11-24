# Multi-tenancy por business

## Verificaciones

Prueba de integración con `api/pb --version` (`pb version 0.40.5`) y
`api/pb serve --http=127.0.0.1:18020 --dir=<temporal> --hooksDir=<temporal> --migrationsDir=<temporal>`.
La instancia usó dos negocios y un usuario de prueba en cada uno.

| Prueba | Resultado observado | Decisión |
|---|---|---|
| `POST /api/collections/probe_items/records` con cuerpo vacío | 200, el hook asignó la relación requerida | Asignar en `onRecordCreateRequest` antes de `e.next()`. |
| `GET` de la lista y `GET/PATCH/DELETE` de registro con `@request.auth.business = business` | Un registro propio, lista ajena vacía y 404 por ID ajeno | Componer el filtro con las reglas de rol. |
| `POST /api/collections/probe_staff/auth-with-password?expand=business` | 200, expansión del negocio propio con `@request.auth.business = id` | El admin puede obtener el negocio con la sesión. |
| `GET /api/files/<colección>/<registro>/<logo>` sin token | 200, bytes iguales al archivo subido con `protected: false` | Usar un campo de archivo público para el logo. |
| `GET /api/probe-runtime` con `typeof Intl` y `typeof URL` | Ambos `undefined` | Usar reglas de zona en JS y validar orígenes sin depender de la API `URL`. |
| `GET /api/probe-runtime` con `$security.sha256("abc")` y `$security.equal` | SHA-256 `ba7816bf…f20015ad`; cadenas iguales → `true`, diferentes → `false` | Usar las funciones nativas para hash y comparación. |
| `POST /api/collections/probe_businesses/records` autenticado como superusuario | 200, `e.hasSuperuserAuth() = true` en el hook de petición y `typeof e.auth = "undefined"` en el de modelo | Autorizar en el hook de petición y sembrar desde el evento de modelo sin depender del actor. |

Referencias de implementación [Hooks de PocketBase](https://pocketbase.io/docs/js-event-hooks/) y
[operaciones de registros](https://pocketbase.io/docs/js-records/).
