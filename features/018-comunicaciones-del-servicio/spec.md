# Especificación: Comunicaciones del servicio (mensajes operativos por correo)

- **Estado:** Completado

## Resumen Ejecutivo

Este conjunto de 9 tareas añade las comunicaciones operativas de JQ Fitness a sus clientes: confirmación de reserva, recordatorio de clase, aviso de cancelación o cambio de clase, promoción desde la lista de espera, aviso de cobro y aviso de renovación. Incluye plantillas editables y bilingües (es/en), render seguro, envío por el correo de PocketBase (SMTP configurable), registro de envíos con reintentos, mensaje manual a los inscritos de una clase y vista de historial. **Solo mensajes propios del servicio**: no hay campañas, boletines, promociones ni seguimiento comercial (el CRM está fuera de alcance de todo el proyecto). El SMS queda fuera de alcance; se deja un punto de extensión documentado.

Entrega:

1. **Modelo de datos**: colecciones `message_templates` y `message_logs`, campo `clients.locale` (`es`|`en`) y plantillas por defecto en español e inglés para las seis claves.
2. **Render y política puros** (`api/src/lib/`): sustitución de variables permitidas con escape HTML, validación de plantillas, elección de idioma, elegibilidad del cliente y calendario de reintentos; probados con `bun test`.
3. **Motor de envío y disparadores** (`api/src/hooks/`): servicio de envío con registro en `message_logs`, reintentos por cron, y disparadores por eventos (reserva, promoción de lista de espera, cancelación de clase) y por cron (recordatorios, cobros, renovaciones).
4. **Rutas de administración**: vista previa de plantilla, mensaje manual a los inscritos de una clase y envío de prueba.
5. **Interfaz `/communications`**: editor de plantillas con variables permitidas y vista previa, historial de envíos y mensaje a una clase; selector de idioma en el formulario del cliente.

Contrato que deja a las siguientes features: la función `sendServiceMessage(key, context)` y la tabla `message_logs` para consultar qué se envió a cada cliente.

---

## Estado actual del repositorio (punto de partida)

| Elemento | Estado |
|----------|--------|
| `api/src/hooks/` | Solo `users.ts` (ejemplo; 005 lo limpia). Los hooks de esta feature van en `api/src/hooks/messages.ts` |
| `api/src/lib/` | Solo `utils.ts`; 005 aporta roles y auditoría, 009 el helper de hora local (solo por contrato) |
| `api/pb_migrations/` | Última: `1795260843_created_admins.js`. Las migraciones de esta feature usan timestamps mayores que los de 005-017 |
| Colecciones | `admins` existe; `clients` (010), `bookings` (011), `class_sessions` (009), `memberships` (013) y `payments` (014) solo por contrato |
| Correo | PocketBase trae cliente SMTP configurable en Ajustes > Correo (`$app.newMailClient()`); no está configurado en este repositorio |
| Archivos de esta feature | `message_*`, `messages.ts`, `TemplateEditor.vue`, `CommunicationsView.vue`: no existen (esta feature los crea) |
| Datos | `clients` pueden existir sin `locale`: se asume `es` por defecto |

> Verificación obligatoria previa: la tarea 001 debe confirmar en la versión de PocketBase instalada (`api/pb`) cómo se hace desde JS el envío (`$app.newMailClient().send(...)`, `$mails.*`), cómo se leen los ajustes SMTP y la API de `cronAdd`, y si las plantillas de correo del sistema se pueden reutilizar o se arma el mensaje (`MailerMessage`) a mano.

---

## Modelo de datos

### Colección `message_templates` (base)

| Campo | Tipo | Reglas | Descripción |
|-------|------|--------|-------------|
| `key` | select | required: `booking_confirmed`, `class_reminder`, `class_cancelled`, `waitlist_promoted`, `payment_due`, `membership_renewal` | Evento que usa la plantilla |
| `locale` | select | required: `es`, `en` | Idioma |
| `subject` | text | required, ≤ 150, sin saltos de línea | Asunto (texto plano) |
| `body` | editor/text | required, ≤ 5000 | Cuerpo con variables `{{nombre}}` |
| `active` | bool | por defecto true | Si está inactiva, el evento no se envía en ese idioma |

- **Índices:** único (`key`, `locale`).
- **Reglas de API:** `listRule`/`viewRule` staff; `createRule`/`updateRule`/`deleteRule` owner. La validación de variables se hace en un hook de solicitud (no basta la regla).
- **Auditoría:** colección añadida a `api/src/lib/audit-config.ts` (005).

### Colección `message_logs` (base)

| Campo | Tipo | Reglas | Descripción |
|-------|------|--------|-------------|
| `client` | relation→clients | required, sin borrado en cascada | Destinatario |
| `template_key` | select | las seis claves + `manual` | Evento o mensaje manual |
| `channel` | select | `email` | Canal (punto de extensión para otros) |
| `status` | select | `sent`, `failed` | Resultado del último intento |
| `error` | text | | Motivo del fallo (sin datos sensibles) |
| `created` | autodate | | Fecha del registro |
| `attempts` | number | por defecto 1 | **Extensión del contrato**: intentos realizados |
| `next_retry_at` | date | | **Extensión**: próximo reintento si `failed` y quedan intentos |
| `dedupe_key` | text | índice único cuando no vacío | **Extensión**: evita duplicados (p. ej. `class_reminder:<booking>`) |
| `session` | relation→class_sessions | opcional | **Extensión**: clase relacionada (historial por clase) |

- **Reglas de API:** `listRule`/`viewRule` staff; escritura `null` (solo hooks).
- **Privacidad:** no se guarda el cuerpo renderizado, solo clave, destinatario, resultado y error.
- La colección no se audita (es un registro del sistema); las plantillas sí.

### Campo `clients.locale`

`select` (`es`|`en`), por defecto `es`; se añade a `clients` con una migración propia (la colección la crea 010).

### Variables permitidas por clave

| Clave | Variables |
|-------|-----------|
| comunes | `client_first_name`, `studio_name`, `studio_phone` |
| `booking_confirmed`, `class_reminder`, `waitlist_promoted` | `class_name`, `class_date`, `class_time`, `coach_name` |
| `class_cancelled` | `class_name`, `class_date`, `class_time`, `cancel_reason` |
| `payment_due` | `plan_name`, `amount`, `due_date` |
| `membership_renewal` | `plan_name`, `period_end`, `amount` |
| `manual` (mensaje a una clase) | `client_first_name`, `class_name`, `class_date`, `class_time`, `studio_name` |

Fechas y horas se formatean en hora de `America/New_York` y en el idioma del cliente; importes desde centavos USD.

---

## Contrato HTTP

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/api/admin/messages/preview` | staff | Renderiza `{ key, locale, subject, body }` con datos de ejemplo; devuelve `{ subject, body, html, unknown_variables[] }` |
| `POST` | `/api/admin/messages/class/{sessionId}` | staff | Mensaje manual `{ subject, body, locale? }` a inscritos `booked` y `waitlisted` de la clase; devuelve `{ sent, failed, skipped }` |
| `POST` | `/api/admin/messages/test` | owner | Envía una plantilla renderizada con datos de ejemplo al correo del admin autenticado (comprueba el SMTP) |

| Condición | Respuesta |
|-----------|-----------|
| Variable no permitida, plantilla vacía o asunto con saltos de línea | `400` con la lista de problemas |
| Clase inexistente o cancelada | `404` / `400` |
| SMTP no configurado | `400` «El correo no está configurado» (en `test`) |
| Más de 200 destinatarios en un envío manual | `400` |

---

## Arquitectura de Cambios

### Fase 1: Modelo de datos (Tarea 001)

**001 - Colecciones, idioma del cliente y plantillas por defecto**
- `api/pb_migrations/<ts>_created_message_templates.js` y `<ts>_created_message_logs.js` con `up`/`down`, índices y reglas del modelo anterior; `<ts>_updated_clients_locale.js` añade `clients.locale`.
- `<ts>_seeded_message_templates.js`: inserta las 12 plantillas (6 claves × es/en) con textos operativos, idempotente (no sobrescribe plantillas editadas); `down` borra solo las insertadas sin modificar.
- Textos por defecto sin contenido promocional.

### Fase 2: Lógica pura (Tareas 002-003)

**002 - Render seguro y validación de plantillas**
- `api/src/lib/message-render.ts`: `ALLOWED_VARIABLES`, `extractVariables(text)`, `validateTemplate({ key, subject, body })`, `renderTemplate(template, vars)` y `renderHtml(body, vars)`. Escape HTML de **cada valor** (`& < > " '`) antes de insertarlo; el cuerpo de la plantilla es texto plano y se convierte a HTML (párrafos y `<br>`) escapando todo; el asunto es texto plano sin saltos de línea; variables desconocidas o ausentes → error de validación, nunca se imprimen `undefined`.
- Pruebas: valores con `<script>`, comillas, `{{` anidado, variables repetidas, valor vacío, saltos de línea en el asunto (inyección de cabeceras), límites de longitud.

**003 - Política de envío y reintentos**
- `api/src/lib/message-policy.ts`: `resolveLocale(client)` (fallback `es`), `isEligible(client, key)` (solo clientes `active` y `paused`; nunca `inactive`; requiere correo válido), `nextRetry(attempts, now)` (backoff 5 min, 30 min, 2 h; máximo 3 intentos), `reminderWindow(session, now, hours)`, `dueNotices(payments, now, daysBefore)` y `renewalNotices(memberships, now, daysBefore)` con ventanas en hora local (envío a las 09:00 locales) y claves de deduplicación.
- Pruebas: cliente inactivo, sin correo, locale ausente, backoff, ventana en el cambio de horario, no duplicar.

### Fase 3: Hooks (Tareas 004-006)

**004 - Motor de envío y registro**
- `api/src/hooks/messages.ts` + `api/src/lib/message-send.ts` (para goja, funciones que reciben `app`): `sendServiceMessage(app, { key, client, context, dedupeKey, session })` carga la plantilla activa del idioma (con fallback al otro idioma si falta), valida elegibilidad, renderiza, envía con `app.newMailClient()` y escribe `message_logs`. Define la interfaz `MessageChannel { name; send(message) }` con la implementación `email`; un canal SMS futuro se registra ahí (punto de extensión documentado, no implementado).
- Un fallo nunca rompe la operación de negocio que lo originó (try/catch + log); `dedupe_key` único evita duplicados.
- Cron `retry_failed_messages` (cada 10 min) reintenta `failed` con `next_retry_at` vencido.
- Hook de solicitud sobre `message_templates` (create/update) que usa `validateTemplate`; añade `message_templates` a `audit-config.ts`.

**005 - Disparadores**
- Tras éxito (`onRecordAfterCreateSuccess`/`onRecordAfterUpdateSuccess`, ejecutados fuera de la transacción de la reserva): `bookings` → `booked` envía `booking_confirmed`; transición `waitlisted → booked` envía `waitlist_promoted`; `class_sessions` con `status` → `cancelled` o cambio de `starts_at`/`coach` envía `class_cancelled` a `booked` y `waitlisted` (usa el gancho de cancelación de 009 y la cancelación en cascada de 011 como origen del evento).
- Crons: `class_reminders` (cada 15 min, ventana `MESSAGES_REMINDER_HOURS`, 24 por defecto), `payment_due_notices` y `renewal_notices` (cada hora, solo se actúa a las 09:00 locales).
- Variables de entorno `MESSAGES_REMINDER_HOURS`, `MESSAGES_DUE_DAYS_BEFORE` (3), `MESSAGES_RENEWAL_DAYS_BEFORE` (5), `STUDIO_NAME`, `STUDIO_PHONE`, leídas con `$os.getenv`.

**006 - Rutas de administración**
- `POST /api/admin/messages/preview`, `.../class/{sessionId}` y `.../test` (contrato anterior) en `api/src/hooks/messages-admin.ts`. El mensaje manual registra cada envío con `template_key = manual` y `session`; respeta la elegibilidad, el tope de 200 destinatarios y escapa todo.
- Comprobaciones añadidas a `scripts/verify-api.sh`.

### Fase 4: Interfaz (Tareas 007-008)

**007 - Composable y editor de plantillas**
- `app/src/composables/useMessageTemplates.ts` (lista, guardar, vista previa con debounce vía `pb.send`) y `app/src/components/communications/TemplateEditor.vue`: `Textarea` de cuerpo, campo de asunto, chips de variables permitidas que insertan en el cursor, vista previa en vivo (se muestra el texto escapado, nunca HTML sin sanear), selector es/en, interruptor de activo, errores de validación del servidor.
- Pruebas Vitest: inserción de variable, variable no permitida marcada, vista previa, guardado.

**008 - Vista `/communications`, rutas y navegación**
- `app/src/views/admin/CommunicationsView.vue` con `Tabs`: Plantillas (solo `owner` edita; los demás ven en lectura), Historial (`DataTable` de `message_logs` con filtros por estado, clave y rango; paginado), Mensaje a clase (selector de clase próxima, vista de destinatarios, asunto/cuerpo, confirmación y resultado).
- Selector de idioma (`clients.locale`) añadido al formulario de clientes de 010.
- Ruta `communications` hija de `AdminLayout` (`meta.title = 'Comunicaciones'`) y entrada en `admin-nav.ts` (`pi pi-envelope`).
- Pruebas: pestañas por rol, filtros del historial, envío manual con confirmación, `admin-nav`.

### Fase final: Verificación y cierre (Tarea 009)

**009 - Pruebas, documentación y verificación**
- Prueba de integración de la lógica con SMTP simulado (servidor de captura o `MailerMessage` interceptado) documentada en `scripts/verify-api.sh`: confirmación, reintento tras fallo y no envío a inactivo.
- `api/README.md`: configuración SMTP, variables, plantillas y punto de extensión para SMS; `app/README.md`: sección Comunicaciones.
- `scripts/verify-api.sh` y `scripts/verify-app.sh` en verde; marcar la feature como completada.

---

## Impacto por Módulo

| Ruta | Cambio |
|------|--------|
| `api/pb_migrations/` | 4 migraciones: `message_templates`, `message_logs`, `clients.locale`, plantillas por defecto |
| `api/src/lib/` | `message-render.ts`, `message-policy.ts`, `message-send.ts` y pruebas; `audit-config.ts` (añade `message_templates`) |
| `api/src/hooks/` | `messages.ts` (motor, disparadores y crons), `messages-admin.ts` (rutas) |
| `scripts/verify-api.sh` | Comprobaciones de mensajes |
| `app/src/composables/` | `useMessageTemplates.ts` |
| `app/src/components/communications/` | `TemplateEditor.vue` |
| `app/src/views/admin/` | `CommunicationsView.vue`; formulario de clientes (selector de idioma) |
| `app/src/router/index.ts`, `app/src/layouts/admin-nav.ts` | Ruta y entrada de navegación |
| `api/README.md`, `app/README.md` | Documentación |

---

## Flujos Críticos

### Flujo 1: Confirmación de reserva
```
1. El admin crea una reserva en estado booked → onRecordAfterCreateSuccess("bookings")
2. messages.ts llama a sendServiceMessage('booking_confirmed') con dedupe_key booking_confirmed:<id>
3. Se elige la plantilla por clients.locale, se renderiza con escape y se envía por SMTP
4. Resultado: message_logs con status sent; si el SMTP falla, status failed con next_retry_at y la reserva sigue creada
```

### Flujo 2: Cliente inactivo o sin correo
```
1. Un evento apunta a un cliente con status inactive o sin email
2. isEligible devuelve false
3. Resultado: no se envía nada ni se registra fallo (se omite); el mensaje manual lo cuenta en skipped
```

### Flujo 3: Clase cancelada con inscritos
```
1. El admin (o un bloqueo de agenda de 009) cancela una class_session con motivo
2. El hook enumera reservas booked y waitlisted y envía class_cancelled a cada una en su idioma
3. Resultado: un registro por destinatario; los fallos se reintentan hasta 3 veces
```

### Flujo 4: Plantilla con variable maliciosa o no permitida
```
1. El owner guarda un cuerpo con {{password}} o asunto con salto de línea
2. validateTemplate (hook de solicitud) lo rechaza con 400
3. Resultado: la plantilla no se guarda; un nombre de cliente con <script> se renderiza escapado
```

---

## Notas de Implementación

### Decisiones
- **Solo mensajes operativos**: no hay plantillas de marketing, baja de suscripción ni segmentación. Por eso no hay opt-out por categoría; si un cliente no debe recibir correos, se marca `inactive` o se quita su correo.
- **Elegibilidad**: se envía a clientes `active` y `paused` (un cliente en pausa puede tener reservas ya hechas); nunca a `inactive` ni sin correo. Decisión revisable.
- **Cuerpo en texto plano con variables**, no HTML libre: elimina el riesgo de inyección y simplifica el editor. El HTML del correo se genera desde el texto escapado con una envoltura fija.
- **Envío fuera de la transacción de negocio** y sin propagar errores: una caída del SMTP no debe impedir reservar ni cancelar.
- **`dedupe_key` único** para que los crons sean idempotentes (recordatorios, cobros, renovaciones) y los reinicios no dupliquen mensajes.
- **Extensión de `message_logs`** (`attempts`, `next_retry_at`, `dedupe_key`, `session`) y valor `manual` en `template_key`: necesarios para reintentos, idempotencia e historial por clase; es una ampliación del contrato a revisar.
- **SMTP en la configuración de PocketBase** (Ajustes > Correo) y no en variables propias, para un solo lugar de configuración; las variables solo cubren textos y ventanas.
- **SMS fuera de alcance**: `MessageChannel` es la costura; añadir un canal implica una implementación y un valor nuevo en `channel`.
- **Horas locales sin `Intl` en goja**: formato de fechas con el helper de hora local y tablas de nombres de mes/día es/en.

### Seguridad
- Escape HTML de todo valor y del cuerpo; asunto sin saltos de línea (evita inyección de cabeceras SMTP).
- Variables de lista blanca por clave; sin acceso a campos arbitrarios del cliente.
- Rutas con `requireAuth("admins")` + rol; edición de plantillas solo `owner`; `message_logs` sin escritura por API.
- El log no guarda el cuerpo ni credenciales; errores del SMTP se registran recortados y sin secretos.
- Tope de destinatarios por envío manual y límite de tasa de las rutas (configuración de PocketBase).

### Referencias
- https://pocketbase.io/docs/js-sending-emails/
- https://pocketbase.io/docs/js-jobs-scheduling/
- https://pocketbase.io/docs/js-event-hooks/
- https://owasp.org/www-community/attacks/Content_Spoofing
- https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html

### Fuera de alcance
- CRM, leads, campañas, boletines, promociones, encuestas y cualquier seguimiento comercial.
- SMS, WhatsApp y notificaciones push (solo punto de extensión).
- Pasarela de pagos y cobros automáticos (los avisos de cobro y renovación son informativos).
- Portal del cliente y preferencias de notificación por cliente.
- Correos del sistema de PocketBase (restablecer contraseña de admins), que se configuran en su propio panel.

---

## Criterios de Aceptación

- [x] Existen `message_templates` (12 plantillas por defecto es/en), `message_logs` y `clients.locale`; las migraciones tienen `down` y se pueden reaplicar sin duplicar.
- [x] Crear una reserva `booked` envía la confirmación en el idioma del cliente y deja un registro `sent`.
- [x] Una promoción desde lista de espera, una cancelación de clase, los recordatorios, los avisos de cobro y los de renovación envían su mensaje una sola vez por destinatario.
- [x] Clientes `inactive` o sin correo no reciben nada; un fallo de SMTP no impide la operación de negocio y se reintenta hasta 3 veces.
- [x] Los valores con HTML se escapan; las plantillas con variables no permitidas o asuntos con saltos de línea se rechazan con `400`.
- [x] El editor muestra variables permitidas y vista previa; solo `owner` edita plantillas.
- [x] El historial lista envíos con filtros; el mensaje manual llega solo a inscritos de la clase.
- [x] No existe ninguna plantilla ni flujo de marketing o seguimiento comercial.
- [x] `bun test`, `scripts/verify-api.sh` y `scripts/verify-app.sh` terminan en verde.

### Verificación de cierre

Las cuatro migraciones se aplicaron, revirtieron y reaplicaron en una base temporal. La suite de API comprobó los seis avisos automáticos, el mensaje manual, los permisos y la recuperación de SMTP con un servidor local de captura. La parte HTML del correo conservó escapado el nombre de prueba. La suite de la app verificó editor, historial, envío con confirmación, idioma y ruta protegida.

El límite de reintentos equivale a tres intentos totales por aviso automático. El envío manual realiza un intento por inscrito elegible y conserva su texto en memoria durante la solicitud.

---

## Dependencias Entre Tareas

```
Feature 009, 010, 011, 013, 014 (contrato) → 001
001 (modelo de datos)          → 004, 008
002 (render seguro)            → 004, 006, 007
003 (política y reintentos)    → 004, 005
004 (motor de envío)           → 005, 006
005 (disparadores)             → 009
006 (rutas de administración)  → 007, 008
007 (editor)                   → 008
008 (vista y navegación)       → 009
001-008                        → 009 (pruebas, documentación y verificación)
```

---

## Validación Post-Deploy

1. `cd api && bun run build:ts && bun test` en verde; PocketBase arranca y aplica las 4 migraciones sin errores.
2. Configurar SMTP en `/_/#/settings/mail` y llamar a `POST /api/admin/messages/test` como owner: llega el correo.
3. Crear una reserva para un cliente `es` y otro `en`: cada uno recibe la confirmación en su idioma y aparece `sent` en el historial.
4. Marcar un cliente `inactive` y repetir: no se envía y no hay registro de fallo.
5. Apagar el SMTP, crear una reserva: la reserva se crea, el log queda `failed` con `next_retry_at`; al restaurar el SMTP el cron lo reenvía.
6. Guardar una plantilla con `{{password}}`: `400`.
7. `scripts/verify-api.sh` y `scripts/verify-app.sh` → todas las comprobaciones en verde.

---

## Prompt y modelo utilizado

### Modelo

Sonnet 5.5

### Prompt

Contexto de la lista de características aprobada para esta feature: «018-comunicaciones-del-servicio: SOLO mensajes operativos (nada de marketing ni seguimiento comercial): confirmación de reserva, recordatorio de clase (cron), aviso de cancelación/cambio de clase (usa el gancho de 009/011), promoción desde lista de espera, aviso de cobro y de renovación (013/014). `message_templates` y `message_logs`, `clients.locale` (es/en), editor de plantillas con variables permitidas y vista previa, render seguro (escape HTML), envío por correo de PocketBase (SMTP configurable; SMS fuera de alcance, documenta punto de extensión), reintentos/registro de fallos, respeto a estado del cliente (no enviar a inactivos), mensaje manual a inscritos de una clase, vista de historial de envíos. Bilingüe EN/ES de plantillas.»

```
Ok, con base en esta lista estructuremos los features que debemos implementar. Cada feature dejala plasmada en español en features/NNN-.../spec.md, crea las carpetas de ser necesario respetando el consecutivo, puedes usar features/spec-template.md como plantilla. Luego con base en ese spec crea las tareas granulares en features/NNN-.../tasks/NNN-....md, creando un consecutivo ordenado, tasks debidamente priorizadas teniendo en cuenta dependencias resueltas con anterioridad, puedes usar features/task-template.md como plantilla. Ten en cuenta la prelación entre unas y otras de manera de generar todo con la prioridad y orden adecuado.

(Descartado explícitamente el CRM/leads; comunicaciones solo propias del servicio.)
```
