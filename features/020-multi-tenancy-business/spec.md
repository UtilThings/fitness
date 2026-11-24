# Especificación: Multi-tenancy por `business`

- **Estado:** Completado

## Resumen Ejecutivo

Este conjunto de 21 tareas convierte el sistema en multi-tenant: la colección `businesses` representa a cada cliente de la plataforma y **todos** los datos operativos (equipo, catálogo, horarios, clientes, reservas, membresías, pagos, coaching, mensajes y auditoría) pertenecen a exactamente un business. El admin (`app/`) es multi-tenant: el sidebar, el título y el logo salen del business del usuario autenticado. El sitio público (`web/`, Astro) **no** es multi-tenant: cada business construye su propio sitio y se integra a la plataforma con una **clave pública de API** que su owner genera en el admin; `web/` actual pasa a ser el primer sitio integrado (el de JQ Fitness).

Decisiones ya acordadas con el equipo:

- Un `admin` pertenece a **un solo** business (campo `business`; sin selector de business ni membresías múltiples).
- La credencial del sitio público es una **clave pública** de solo lectura (no secreta, porque `web/` consulta la API desde el navegador) más **orígenes permitidos por business**; reemplaza a `PUBLIC_SITE_ORIGINS`.
- Cada business define además de nombre y logo: **ciudad y contacto, moneda y zona horaria** (hoy fijas: `JQ Fitness`, `USD`, `America/New_York`).
- Los business los crea un **superusuario de PocketBase** (`/_/`); dentro del admin el owner solo edita su propio business. No hay pantalla de plataforma.

Entrega:

1. **Modelo `businesses` y campo `business`** en `admins` y en las 17 colecciones de dominio, con migración y backfill hacia un business por defecto («JQ Fitness») que conserva los datos actuales.
2. **Aislamiento por reglas de API y hooks**: cada regla filtra por `business = @request.auth.business`; un hook asigna el business en el servidor, impide cambiarlo y valida que las relaciones cruzadas pertenezcan al mismo business; rutas `/api/admin/*`, crons, mensajes, reportes y auditoría trabajan siempre acotados a un business.
3. **Zona horaria, moneda y recibos por business**: `tz.ts` deja de asumir Nueva York; reportes, dashboard, agenda, membresías, pagos y mensajes usan la zona del business; el prefijo de recibos y su secuencia son por business.
4. **API pública por clave**: `GET /api/public/catalog` y `/schedule` exigen `X-Business-Key`, devuelven solo datos de ese business y aplican CORS con los orígenes configurados en él.
5. **Admin**: marca dinámica (nombre y logo del business), vista «Negocio» (datos del owner) y vista «Integración» (generar/rotar clave y orígenes).
6. **`web/`**: lee `PUBLIC_BUSINESS_KEY`, envía la clave y mantiene su respaldo estático.
7. **Pruebas de aislamiento** entre dos business sobre cada colección y ruta, documentación y script de verificación.

Contrato que deja a las siguientes features: toda colección nueva debe llevar `business` y reglas `ruleBusiness`; las rutas públicas versionadas exigen clave; cualquier cliente externo (otros sitios) se integra con ese mismo contrato.

---

## Estado actual del repositorio (punto de partida)

| Elemento | Estado |
|----------|--------|
| `api/pb_migrations/` | 29 migraciones; la última es `1795265103_seeded_message_templates.js` (las nuevas deben tener timestamp posterior) |
| Colecciones | `admins` (auth), `audit_logs`, `services`, `plans`, `class_templates`, `class_sessions`, `schedule_blocks`, `coach_availability`, `clients`, `bookings`, `memberships`, `credit_movements`, `receipt_sequences`, `payments`, `coaching_programs`, `coaching_checkins`, `message_templates`, `message_logs`; la colección heredada `users` queda fuera (alta cerrada, sin datos de dominio) |
| Reglas | `api/src/lib/rules.ts`: `RULE_STAFF` y `RULE_OWNER` solo comprueban rol y `active`; ninguna regla filtra por tenant |
| Índices únicos globales | `services(slug)`, `clients(email)`, `message_templates(key, locale)`, `receipt_sequences(year)`, `payments(receipt_number)`: deben pasar a ser por business |
| Zona horaria | `api/src/lib/tz.ts` implementa a mano las reglas de horario de verano de EE. UU. (`nyOffsetMinutes`); la usan 20 módulos de `lib/` y `hooks/` |
| Moneda y marca | `USD` fija en API, app y `web`; `app/src/lib/business.ts` (`JQ Fitness`, `Miramar, FL`), `AdminLayout.vue` y `AuthLayout.vue` con nombre y `jq-logo.png` incrustados; `STUDIO_NAME`/`STUDIO_PHONE` por variable de entorno en `message-send.ts` y `message-admin.ts`; prefijo de recibo `JQ-` en `receipt-number.ts` |
| API pública (019) | `GET /api/public/catalog` y `/schedule` sin autenticación; CORS por `PUBLIC_SITE_ORIGINS`; caché de servidor con claves globales (`public:v1:*`) |
| Crons | `memberships-cron.ts` y `messages-triggers.ts` operan sobre todos los registros sin distinguir tenant |
| `web/` | Sitio estático con `PUBLIC_SITE_URL` y `PUBLIC_API_URL`; `src/lib/api.ts` consume la API pública sin credencial |
| Archivos nuevos | `businesses`, helpers de tenant y vistas «Negocio» e «Integración»: no existen (esta feature los crea) |

> La tarea 001 verificó PocketBase 0.40.5. El hook de petición puede asignar la relación requerida, las reglas y la expansión funcionan, el logo público se descarga sin token y `$security` ofrece SHA-256 y comparación constante. Goja carece de `Intl` y `URL`, por lo que se implementarán las reglas de zona y la validación de orígenes en JavaScript. Véase [Verificaciones](../../docs/multi-tenancy.md#verificaciones).

---

## Contrato

### Colección `businesses`: acceso

| Operación | Quién |
|-----------|-------|
| `list` / `view` | Staff activo del propio business (`id = @request.auth.business`) |
| `update` | Owner activo del propio business, campos de marca, contacto y orígenes (ver modelo) |
| `create` / `delete` | Solo superusuario (`null`) |

### Rutas admin nuevas

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/api/admin/business/public-key` | Owner activo | Genera o rota la clave pública del propio business; devuelve la clave completa **una sola vez** |

### Rutas públicas (cambian respecto a 019)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/public/catalog` | Cabecera `X-Business-Key` | Catálogo del business dueño de la clave |
| `GET` | `/api/public/schedule?week=` | Cabecera `X-Business-Key` | Horario del business, semana según su zona horaria |
| `OPTIONS` | ambas | ninguna | Preflight con `Access-Control-Allow-Headers: X-Business-Key` |

Las respuestas añaden un objeto `business` (campos públicos) y `version` pasa a `2`:

```json
{
  "version": 2,
  "business": {
    "name": "JQ Fitness",
    "city": "Miramar, FL",
    "logo_url": "https://api.example.com/api/files/businesses/abc/logo.png",
    "currency": "USD",
    "timezone": "America/New_York"
  },
  "currency": "USD",
  "services": [
    {
      "slug": "group-strength",
      "kind": "group",
      "name": "Group Strength",
      "plans": [
        {
          "name": "8-Class Pack",
          "price_cents": 26000,
          "billing_unit": "per_4_weeks",
          "sessions": 8,
          "per_week": 2,
          "commitment_periods": 0,
          "is_first_class": false,
          "partner": false,
          "note": ""
        }
      ],
      "weekly_times": [
        {
          "weekday": 2,
          "time": "09:00",
          "coach_name": "Coach JQ",
          "capacity": 6
        }
      ]
    }
  ]
}
```

```json
{
  "version": 2,
  "business": {
    "name": "JQ Fitness",
    "city": "Miramar, FL",
    "logo_url": "https://api.example.com/api/files/businesses/abc/logo.png",
    "currency": "USD",
    "timezone": "America/New_York"
  },
  "timezone": "America/New_York",
  "week_start": "2026-11-15",
  "week_end": "2026-11-21",
  "sessions": [
    {
      "local_date": "2026-11-17",
      "local_time": "09:00",
      "service": {
        "slug": "group-strength",
        "name": "Group Strength"
      },
      "coach_name": "Coach JQ",
      "capacity": 6,
      "spots_left": 2,
      "status": "almost"
    }
  ]
}
```

El resto del cuerpo (`services`, `plans`, `weekly_times`; `sessions` en `schedule`) no cambia; `timezone` de `schedule` es la del business.

### Errores públicos

| Condición | Respuesta |
|-----------|-----------|
| Falta `X-Business-Key` o es inválida, o el business está inactivo | `401` `{ "message": "Clave de API inválida" }` (mismo cuerpo en todos los casos y comparación de hashes en tiempo constante) |
| Origen no permitido por el business | Respuesta normal sin cabeceras CORS |
| `week` mal formado o fuera de rango | `400`, igual que en 019 |
| Error interno | `500` genérico |

---

## Modelo de datos

### Colección `businesses` (tipo base)

| Campo | Tipo | Reglas | Descripción |
|-------|------|--------|-------------|
| `name` | text | required, máx. 80 | Nombre visible en admin, sitio y mensajes |
| `slug` | text | required, único, `^[a-z0-9]+(-[a-z0-9]+)*$` | Identificador estable; lo asigna el superusuario |
| `logo` | file | 1 archivo, imágenes, ≤ 2 MB, **no protegido** | Logo del sidebar y de la API pública |
| `city` | text | máx. 80 | Ciudad mostrada |
| `phone`, `email` | text | opcionales | Contacto del negocio (mensajes y sitio) |
| `currency` | select | required: `USD`, `EUR`, `MXN`, `COP`, `CRC`, `GBP` | Moneda única del business |
| `timezone` | text | required, zona IANA válida | Zona de horarios, reportes y recibos |
| `receipt_prefix` | text | required, 2-6 caracteres `[A-Z0-9]` | Prefijo de recibos (`JQ`) |
| `active` | bool | | `false` bloquea el login del equipo y la API pública |
| `public_key_prefix` | text | único, 8 caracteres | Parte visible de la clave, sirve para localizarla |
| `public_key_hash` | text | **oculto** | Hash de la clave completa (nunca la clave) |
| `public_key_rotated_at` | date | | Última generación |
| `allowed_origins` | json | lista de orígenes `https?://host[:puerto]`, máx. 10, sin `*` | Orígenes CORS del sitio |
| `created`, `updated` | autodate | | |

- **Índices:** único en `slug` y en `public_key_prefix` (donde no sea vacío).
- **Reglas de API:** según la tabla de acceso anterior; `public_key_hash`, `currency`, `timezone`, `receipt_prefix`, `slug` y `active` solo los modifica el superusuario (el owner no puede enviarlos).
- **Borrado:** `cascadeDelete = false` en todas las relaciones `business`; un business con datos no se elimina.

### Campo `business` en colecciones existentes

Relación a `businesses`, `required`, `maxSelect: 1`, `cascadeDelete: false`, con índice. Se agrega a: `admins`, `audit_logs`, `services`, `plans`, `class_templates`, `class_sessions`, `schedule_blocks`, `coach_availability`, `clients`, `bookings`, `memberships`, `credit_movements`, `receipt_sequences`, `payments`, `coaching_programs`, `coaching_checkins`, `message_templates`, `message_logs`.

Índices que cambian:

| Colección | Antes | Después |
|-----------|-------|---------|
| `services` | `(slug)` único | `(business, slug)` único |
| `clients` | `(email)` único si no vacío | `(business, email)` único si no vacío |
| `message_templates` | `(key, locale)` único | `(business, key, locale)` único |
| `receipt_sequences` | `(year)` único | `(business, year)` único |
| `payments` | `(receipt_number)` único | `(business, receipt_number)` único |

Las demás unicidades (`plans(service, name)`, `class_templates(service, weekday, start_time)`, `bookings(session, client)`…) ya quedan acotadas porque sus relaciones pertenecen a un business.

### Regla de tenant

`ruleBusiness = '@request.auth.business = business'` (en `list`, `view`, `update`, `delete`). Para `admins` la comparación es contra el propio campo. `createRule` solo exige `RULE_STAFF`/rol; el hook de la tarea 007 fija `business` (no se confía en el cuerpo de la petición).

---

## Arquitectura de Cambios

### Fase 1: Fundamentos de datos y aislamiento (Tareas 001-008)

**001 - Verificación de PocketBase y decisiones técnicas**
- Comprueba el comportamiento de PocketBase 0.40.5 y deja los hallazgos en la sección de notas de la tarea y en `docs/multi-tenancy.md` (borrador).

**002 - Colección `businesses` y business por defecto**
- Migración que crea `businesses` y siembra el business por defecto con `STUDIO_NAME`/`STUDIO_PHONE` (o `JQ Fitness`), `America/New_York`, `USD`, `JQ`.

**003 - Campo `business` en `admins` y catálogo/agenda**
- `admins`, `services`, `plans`, `class_templates`, `class_sessions`, `schedule_blocks`, `coach_availability`: campo, backfill al business por defecto, `required`, índices.

**004 - Campo `business` en clientes y operación**
- `clients`, `bookings`, `memberships`, `credit_movements`, `receipt_sequences`, `payments`, `coaching_programs`, `coaching_checkins`: igual que 003, con los índices únicos por business.

**005 - Campo `business` en mensajes y auditoría**
- `message_templates`, `message_logs`, `audit_logs`; las plantillas semilla (018) se duplican por business nuevo mediante una función reutilizable `seedBusinessDefaults`.

**006 - Reglas de API por business**
- `ruleBusiness` y composición en `api/src/lib/rules.ts`; migración que reescribe `list/view/update/delete` de todas las colecciones; `businesses` con su tabla de acceso; pruebas de reglas generadas frente a literales.

**007 - Hook de asignación y consistencia de business**
- `api/src/hooks/tenant.ts` + `api/src/lib/tenant.ts`: en creación fija `business` desde `@request.auth`; en actualización rechaza cambiarlo; valida que las relaciones (cliente↔sesión, plan↔servicio, pago↔membresía…) compartan business (`TENANT_REFERENCES`); `admins` inactivos o de business inactivo no inician sesión.

**008 - Equipo y auditoría por business**
- Reglas «al menos un owner activo» y `ADMIN_REFERENCES` acotadas por business; `audit` guarda `business` y los owners solo leen el suyo.

### Fase 2: Zona horaria, moneda y mensajes por business (Tareas 009-013)

**009 - Zona horaria por business en `tz.ts`**
- Funciones de `tz.ts` reciben la zona (`tz: string`), con `America/New_York` como valor explícito en las llamadas existentes mientras se migra; implementación con `Intl` si goja lo soporta o con reglas propias (EE. UU. y UE) si no; pruebas con transiciones DST de al menos tres zonas.

**010 - Zona horaria en agenda, reservas, membresías y pagos**
- `schedule-gen`, `schedule-store`, `scheduling*`, `booking-availability`, `membership-cycles`, `memberships-service`, `payments-*`, `client-request` leen la zona del business del registro.

**011 - Zona horaria en reportes, dashboard y mensajes; crons por business**
- `reports-*`, `dashboard`, `message-policy`, `message-render`, `message-triggers`, `memberships-cron`: cálculo por business; los crons iteran los business activos.

**012 - Moneda y recibos por business**
- `formatReceipt`/`parseReceipt` reciben el prefijo; `receipt_sequences` y `payments` por business; reportes financieros validan moneda única; moneda expuesta en rutas admin.

**013 - Mensajes con datos del business**
- `studio_name`, `studio_phone` y remitente salen de `businesses`; se retiran `STUDIO_NAME`/`STUDIO_PHONE` (compatibilidad solo como valor del business por defecto en 002).

### Fase 3: API pública por clave (Tareas 014-015)

**014 - Clave pública y orígenes del business**
- `api/src/lib/business-key.ts` (generar, hashear, verificar en tiempo constante, formato `pk_<8 prefijo>_<32 secreto>`), ruta `POST /api/admin/business/public-key`, validación de `allowed_origins`.

**015 - Rutas públicas por business**
- `public.ts` y `public-store.ts`: resuelven business por clave, filtran todas las consultas por `business`, caché `public:v2:<business>:…`, CORS con `allowed_origins`, `X-Business-Key` en preflight, respuesta `version: 2`.

### Fase 4: Admin multi-tenant (Tareas 016-018)

**016 - Composable de business y marca en el admin**
- `useBusiness` (carga `expand=business` en el login), nombre y logo en `AdminLayout.vue`, `document.title`, formato de moneda y zona del business; `AuthLayout.vue` con marca neutral (`VITE_APP_NAME`, por defecto «Admin») porque aún no se conoce el business; retiro de `business.ts` y `VITE_BUSINESS_CONTACT`.

**017 - Vista «Negocio»**
- Ruta `/settings/business` (solo owner): nombre, logo, ciudad, teléfono y email; moneda, zona y prefijo visibles en solo lectura.

**018 - Vista «Integración»**
- Ruta `/settings/integration` (solo owner): prefijo de la clave, fecha de rotación, botón «Generar/rotar» con diálogo que muestra la clave una vez y la opción de copiarla, editor de orígenes permitidos con validación.

### Fase 5: Sitio público (Tarea 019)

**019 - `web/` con clave pública**
- `PUBLIC_BUSINESS_KEY` en `web/src/lib/env.ts`, `.env.example` y `Dockerfile`; `api.ts` envía `X-Business-Key` y valida `version: 2`; el respaldo estático se mantiene; el nombre del business viene de la API con respaldo local.

### Fase final: Verificación y cierre (Tareas 020-021)

**020 - Pruebas de aislamiento entre business**
- `scripts/verify-tenancy.ts`: dos business con datos; ninguna colección ni ruta filtra datos del otro (lectura, escritura, relaciones cruzadas, rutas `/api/admin/*`, API pública, crons).

**021 - Documentación y verificación**
- `docs/multi-tenancy.md` (alta de business y primer owner, rotación de clave, integración de un sitio nuevo), `api/README.md`, `app/README.md`, `web/README.md`; `scripts/verify-api.sh`, `verify-app.sh`, `verify-web.sh` y `verify-mvp.sh` actualizados.

---

## Impacto por Módulo

| Ruta | Cambio |
|------|--------|
| `api/pb_migrations/` | Migraciones de `businesses`, campo `business`, índices y reglas |
| `api/src/lib/rules.ts` | `ruleBusiness` y composición |
| `api/src/lib/tenant.ts`, `business-key.ts` | Nuevos: asignación, consistencia, clave pública |
| `api/src/lib/tz.ts` y consumidores | Zona por parámetro |
| `api/src/lib/receipt-number.ts`, `payments-*` | Prefijo y secuencia por business |
| `api/src/lib/message-*.ts`, `memberships-cron.ts` | Datos y crons por business |
| `api/src/lib/public-*.ts`, `hooks/public.ts` | Clave, caché y CORS por business |
| `api/src/hooks/tenant.ts`, `admins.ts`, `audit.ts` | Hook de tenant, equipo y auditoría |
| `app/src/composables/useBusiness.ts`, `layouts/`, `views/settings/`, `router/` | Marca dinámica y vistas «Negocio»/«Integración» |
| `app/src/lib/business.ts`, `env.ts` | Se eliminan/reemplazan |
| `web/src/lib/{api,env}.ts`, `Dockerfile`, `.env.example` | Clave pública |
| `scripts/` | `verify-tenancy.ts` y scripts existentes |
| `docs/`, `README.md` | Documentación de multi-tenancy |

---

## Flujos Críticos

### Flujo 1: Alta de un nuevo business
```
1. El superusuario crea un registro en `businesses` desde /_/ (nombre, slug, moneda, zona, prefijo, active).
2. Un hook (`seedBusinessDefaults`) crea las plantillas de mensajes del business.
3. El superusuario crea el primer admin con `role = owner` y `business` = el nuevo.
4. El owner inicia sesión: el sidebar muestra su nombre y logo; solo ve sus datos.
5. Resultado: el nuevo business está vacío y aislado; el business por defecto no cambia.
```

### Flujo 2: Integración de un sitio público
```
1. El owner abre Ajustes → Integración, agrega el origen del sitio y pulsa «Generar clave».
2. La API guarda prefijo y hash, y devuelve la clave una sola vez.
3. El desarrollador del sitio la configura (`PUBLIC_BUSINESS_KEY` en `web/`) y construye el sitio.
4. El sitio llama `GET /api/public/catalog` con `X-Business-Key`; en el navegador, el origen debe estar permitido.
5. Resultado: el sitio ve solo el catálogo y el horario de su business, en su zona horaria y moneda.
```

### Flujo 3: Intento de acceso entre business
```
1. Un owner del business A pide por id un registro del business B (o envía `business` de B al crear).
2. La regla `ruleBusiness` devuelve 404 en lectura/edición; el hook ignora el `business` del cuerpo y usa el de la sesión.
3. Una relación cruzada (reserva con cliente de B y sesión de A) se rechaza con 400.
4. Resultado: sin datos filtrados ni escritos en el otro business.
```

### Flujo 4: Clave inválida o rotada
```
1. Un sitio envía una clave inexistente, revocada por rotación o de un business inactivo.
2. La API responde 401 con el mismo mensaje y sin distinguir el motivo.
3. Resultado: la clave anterior deja de funcionar al rotar; el sitio muestra su respaldo estático.
```

---

## Notas de Implementación

### Decisiones
- **Un admin, un business**: simplifica reglas (`@request.auth.business`) y evita el estado «business activo». Alternativa descartada: tabla de membresías con selector.
- **Aislamiento por reglas y hooks, no por bases de datos separadas**: una sola base y una sola API; la consistencia se garantiza con `ruleBusiness`, el hook de asignación y `TENANT_REFERENCES`. Las rutas que usan `$app` (acceso interno) deben filtrar por `business` explícitamente.
- **Clave pública con hash**: se guarda solo el hash y un prefijo para localizarla; rotar invalida la anterior. No es un secreto de servidor: el control real es la lista de orígenes y el acceso de solo lectura a datos ya públicos.
- **Moneda, zona y prefijo de recibo solo los cambia el superusuario**: modificarlos con datos existentes rompería reportes, recibos y horarios; el owner los ve en solo lectura.
- **Login sin business conocido**: `AuthLayout.vue` usa marca neutral; la marca del business aparece tras autenticarse. Alternativa descartada: subdominio por business.
- **Un único `receipt_sequences` por (business, año)**: el prefijo vive en `businesses`; los recibos ya emitidos conservan su texto.

### Migraciones
- Archivos `api/pb_migrations/<timestamp>_<verbo>_<objeto>.js` con timestamp posterior a `1795265103`, con `up` y `down`.
- Patrón por colección: agregar el campo no requerido → backfill al business por defecto (el único existente) → marcar `required` → crear índices. `down` elimina campo e índices sin tocar datos de dominio.
- Idempotentes ante una base vacía o ya migrada.

### Convención de código
- Lógica pura en `api/src/lib/*.ts` con pruebas `bun test`; acceso a PocketBase en `*-store.ts`; los hooks solo registran. En goja no hay scope compartido: cada callback usa `require` dentro del handler.
- Toda consulta interna con `$app` debe incluir `business = {:business}`; una colección nueva debe registrarse en `TENANT_COLLECTIONS` y `TENANT_REFERENCES`, y el verificador de aislamiento falla si falta.

### Seguridad
- La clave completa no se guarda, no se registra y no se audita; `public_key_hash` es oculto y nunca sale en respuestas ni en `audit_logs`.
- Comparación de hash en tiempo constante; respuesta `401` idéntica ante clave inexistente, rotada o business inactivo.
- Los logos de negocios son públicos. Los avatares del equipo requieren un token de archivo y acceso al registro de su negocio.
- `allowed_origins` sin comodines; la API pública es de solo lectura y sin datos personales.
- Los superusuarios acceden a todo; se documenta que nunca deben usarse desde la app.

### Referencias
- https://pocketbase.io/docs/js-routing/
- https://pocketbase.io/docs/js-event-hooks/
- https://pocketbase.io/docs/api-rules-and-filters/
- https://pocketbase.io/docs/js-migrations/
- `features/019-catalogo-publico-en-web/spec.md` (contrato público previo).

### Fuera de alcance
- Selector de business y usuarios en varios business.
- Pantalla de plataforma, facturación y planes de suscripción de los business.
- Dominios o subdominios por business para el admin.
- Cambio de moneda/zona de un business con datos; conversión entre monedas.
- Sitios públicos adicionales (cada business desarrolla el suyo) y formularios/CRM.
- Reserva en línea desde el sitio público.

---

## Criterios de Aceptación

- [x] Existe `businesses` y todas las colecciones de dominio tienen `business` requerido; los datos actuales pertenecen al business por defecto sin pérdida.
- [x] Con dos business, ningún usuario lista, lee, edita ni borra registros del otro, en ninguna colección ni ruta `/api/admin/*`.
- [x] Un cuerpo con `business` ajeno al crear se ignora; cambiar `business` en una edición se rechaza; las relaciones cruzadas entre business se rechazan.
- [x] Las unicidades (`slug`, `email` de cliente, plantillas, recibos) son por business.
- [x] Horarios, reportes, dashboard, crons, recibos y mensajes usan la zona, moneda, prefijo y datos de contacto del business propio.
- [x] El sidebar, el título del documento y el logo del admin muestran los del business del usuario; el owner edita nombre, logo, ciudad y contacto; moneda, zona y prefijo son de solo lectura.
- [x] El owner genera/rota la clave pública (se muestra una sola vez) y configura orígenes; la clave anterior deja de funcionar.
- [x] `GET /api/public/catalog` y `/schedule` responden `401` sin clave o con clave inválida; con clave válida solo devuelven datos del business y CORS solo para sus orígenes.
- [x] `web/` funciona con `PUBLIC_BUSINESS_KEY` y conserva su respaldo estático si la API falla o la clave es inválida.
- [x] `docs/multi-tenancy.md` y `scripts/verify-tenancy.ts` existen y los scripts de verificación terminan en verde.
- [x] `bun run build:ts` y `bun test` (api), y `lint`, `typecheck`/`check`, `test` y `build` (app y web) terminan en verde.

La verificación incluyó migraciones con datos anteriores, 19 colecciones con dos negocios, detección de una regla eliminada, rutas públicas y administrativas, crons y archivos protegidos. `scripts/verify-mvp.sh` terminó en verde para API, admin y Astro. Además, un build de Astro consumió PocketBase 0.40.5 con un negocio recién creado, su clave pública y precios en COP. Consulta el [procedimiento y la evidencia de configuración](../../docs/multi-tenancy.md).

---

## Dependencias Entre Tareas

```
Feature 005-018 (colecciones y reglas actuales) → 001, 002
001 (verificación)                 → 002, 007, 009, 014
002 (businesses + por defecto)     → 003, 004, 005, 014
003, 004, 005                      → 006
006 (reglas por business)          → 007
007 (hook de tenant)               → 008, 010, 011, 012, 013, 015
009 (tz por zona)                  → 010, 011
010, 011                           → 012 (recibos usan zona), 015
012, 013                           → 020
014 (clave pública)                → 015, 018
015 (rutas públicas)               → 019
006, 007                           → 016
016 (useBusiness)                  → 017, 018
015, 019                           → 020
017, 018, 020                      → 021 (documentación y verificación)
```

---

## Validación Post-Deploy

1. `cd api && bun run build:ts && bun test` en verde; PocketBase aplica las migraciones sobre una copia de datos reales sin errores y todos los registros quedan con el business por defecto.
2. Crear un segundo business y su owner desde `/_/`; iniciar sesión con cada owner: cada sidebar muestra su nombre y logo y cada listado está vacío o contiene solo lo propio.
3. `curl` a `GET /api/collections/clients/records/<id de B>` con el token de A → `404`.
4. Generar la clave en Ajustes → Integración; `curl -H "X-Business-Key: <clave>" $API/api/public/catalog` → `200` con `business` y solo su catálogo; sin cabecera → `401`; rotar y repetir con la clave anterior → `401`.
5. `curl -H "Origin: https://permitido.example" ...` incluye `Access-Control-Allow-Origin`; con otro origen, no.
6. `cd web && bun run build` con `PUBLIC_BUSINESS_KEY` real genera precios reales; con clave inválida usa el respaldo.
7. `scripts/verify-tenancy.ts` y `scripts/verify-mvp.sh` → todo en verde.

---

## Prompt y modelo utilizado

### Modelo

Sonnet 5.5

### Prompt

```
Necesitamos implementar soporte multi-tennancy, la coleccion puede ser business. El admin es multi tenancy, el titulo mostrado en el sidebar debe ser el nombre del business, el logo tambien, etc., pero el web en Astro debe responder solo a un business, es decir cada business va a "desarrollar" su propio pagina publica digamos integrandose a nuestro sistema con algun API token o algo asi que configure en el propio admin, entonces este web en astro lo tomaríamos como un primer site integrado para un cliente.

Por favor aclara cualquier cosa antes de proceder.

No debes implementar nada, el plan que generaras déjalo plasmado en español en features/NNN-.../spec.md, crea las carpetas de ser necesario respetando el consecutivo, puedes usar features/spec-template.md como plantilla. Luego con base en ese spec crea las tareas granulares en features/NNN-.../tasks/NNN-....md, creando un consecutivo ordenado, tasks debidamente priorizadas teniendo en cuenta dependencias resueltas con anterioridad, puedes usar features/task-template.md como plantilla.
```

Aclaraciones acordadas: un admin pertenece a un solo business; clave pública + orígenes permitidos por business; configuración propia del business: ciudad y contacto, moneda y zona horaria; los business los crea un superusuario de PocketBase.
