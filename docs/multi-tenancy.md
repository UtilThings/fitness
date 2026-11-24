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

## Dar de alta un negocio

1. Compila los hooks con `bun run build:ts` desde `api/` y arranca PocketBase. En una instancia existente, guarda una copia de `pb_data` antes de aplicar las migraciones. El catálogo, el equipo y los registros existentes se asignan a `jq-fitness`, el negocio inicial.
2. Entra como superusuario a `/_/`. En **Collections → businesses**, crea un registro con nombre, slug único en minúsculas, moneda, zona IANA, prefijo de recibos y `active` activado. Puedes cargar un logo y añadir ciudad, teléfono y correo. El alta crea las 12 plantillas de avisos en español e inglés.
3. En **Collections → admins**, crea el primer integrante con correo único, `role = owner`, `active = true` y la relación `business` al negocio nuevo. El superusuario administra la plataforma. El owner opera su negocio con las credenciales de `admins`.
4. Inicia sesión en el admin con el owner nuevo. En **Ajustes → Negocio**, confirma el nombre, logo, ciudad y contacto. El owner puede editar esos campos y gestionar el equipo de su negocio.
5. Configura en **Ajustes → Aplicación** de PocketBase la URL pública de la API. La URL de los logos públicos usa ese valor.

Las migraciones preservan el formato y los números de los recibos emitidos. El negocio inicial usa USD, `America/New_York` y el prefijo `JQ`. La semilla puede importar una sola vez `STUDIO_NAME`, `STUDIO_PHONE` y `PUBLIC_SITE_ORIGINS` de una instalación anterior. Tras el alta, la configuración se lee de `businesses`.

## Moneda, fechas y numeración

- Las monedas admitidas son `USD`, `EUR`, `MXN`, `COP`, `CRC` y `GBP`. Los importes se guardan en centavos. Cada pago conserva su moneda y se rechaza un reporte de ingresos si sus datos mezclan monedas.
- Usa un identificador de `SUPPORTED_TIMEZONES` en `api/src/lib/tz.ts`. La agenda y los avisos usan la hora civil del negocio. Los instantes se guardan en UTC. En el salto de verano, una hora omitida se desplaza por el tamaño del salto. En el retroceso se elige la primera ocurrencia. Goja aplica reglas explícitas para el calendario operativo. `America/Vancouver` mantiene UTC−07:00 desde el cambio de marzo de 2026. [Comunicado del Gobierno de Columbia Británica](https://news.gov.bc.ca/releases/2026AG0013-000209)
- Usa un prefijo de 2 a 6 letras mayúsculas o números. El contador es independiente por negocio y año de la fecha de pago. El prefijo se aplica al emitir el recibo y los comprobantes previos conservan su número.
- Moneda, zona y prefijo son de solo lectura para el owner. Los cambios los realiza el superusuario tras revisar cómo afectan el calendario y los importes históricos.

## Conectar un sitio y rotar la clave

1. Como owner, abre **Ajustes → Integración**. Añade el origen del sitio, por ejemplo `https://fitness.example.com`. Escribe un origen por línea, con protocolo y puerto si no es el predeterminado. Se admiten hasta diez orígenes exactos. Para desarrollo local puedes incluir `http://localhost:4321`.
2. Pulsa **Generar clave** y copia el valor completo antes de cerrar el diálogo. La vista conserva el prefijo y la fecha de rotación. Usa la clave para las consultas públicas de solo lectura.
3. Configura el sitio. En `web/`, define `PUBLIC_SITE_URL`, `PUBLIC_API_URL` y `PUBLIC_BUSINESS_KEY` en `.env` o en el entorno de compilación. `PUBLIC_BUSINESS_KEY` es visible en los archivos estáticos. Usa un build y una clave por sitio.
4. Para otro cliente web, envía la misma cabecera en ambas consultas. Las respuestas usan `version: 2` y un objeto `business` con nombre, ciudad, URL del logo, moneda y zona. La agenda recibe una fecha `week` opcional con formato `YYYY-MM-DD`.

```bash
curl -H "X-Business-Key: $PUBLIC_BUSINESS_KEY" \
  -H "Origin: https://fitness.example.com" "$PUBLIC_API_URL/api/public/catalog"
curl -H "X-Business-Key: $PUBLIC_BUSINESS_KEY" \
  -H "Origin: https://fitness.example.com" "$PUBLIC_API_URL/api/public/schedule"
```

Al rotar, la clave anterior caduca de inmediato. Copia la nueva, actualiza la configuración de compilación y reconstruye el sitio. Una clave ausente, inválida, rotada o de un negocio inactivo devuelve `401`. Astro usa el respaldo estático en un build con una API inaccesible o una clave rechazada, y conserva los precios del build si falla la revalidación en el navegador.

En un preflight, el navegador comunica que enviará `X-Business-Key`. La API permite un origen configurado en alguna integración activa para esa comprobación inicial. En el GET, comprueba el origen contra el negocio de la clave. La caché interna usa el ID del negocio y la semana local. Las respuestas de lectura pública del negocio incluyen `Cache-Control: no-store` para que la rotación surta efecto en cada consulta.

## Mantener el aislamiento

Cada admin tiene un solo negocio. Las reglas de PocketBase combinan el rol con `ruleBusiness` para listar, ver, actualizar y borrar. Una petición sobre un registro ajeno devuelve `404` cuando la operación tiene regla, y `403` cuando está reservada al servidor. Los avatares de `admins` requieren tokens de archivo y la regla de lectura del propio negocio. Los logos de `businesses` son públicos. La colección heredada `users` está fuera del modelo operativo.

Para añadir una colección de dominio:

- Incluye una relación `business` requerida con `maxSelect: 1`, `cascadeDelete: false` y un índice. Acota al negocio las unicidades que antes serían globales. Si hay datos existentes, rellena la relación antes de hacerla obligatoria.
- Registra la colección en `TENANT_COLLECTIONS` y añade sus relaciones a `TENANT_REFERENCES`. En las reglas abiertas al equipo, compón el rol con `ruleBusiness`. Mantén nulas las operaciones reservadas al servidor.
- En las peticiones de alta, hereda el negocio de la sesión. En las rutas administrativas, acota por el negocio autenticado antes de resolver un ID. Si la operación nace de otro registro, hereda su negocio y valida las relaciones al guardar. Los superusuarios deben indicar el negocio cuando crean registros de dominio.
- Itera negocios activos en los crons. Aplica la zona en cálculos civiles. Asigna negocio y actor al auditar, y registra campos sensibles en `SENSITIVE_FIELDS`.
- Añade datos para ambos negocios en `scripts/verify-tenancy.ts`. Ejecuta `scripts/verify-mvp.sh` desde la raíz para verificar PocketBase, el admin y el sitio. El verificador comprueba el inventario de colecciones, relaciones y reglas. Quita temporalmente una regla de una instancia desechable para confirmar que detecta la ausencia y luego la restaura.
