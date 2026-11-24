# Envío de correos

JQ Fitness usa el servidor SMTP configurado en PocketBase. Por ese servidor salen los avisos automáticos a clientes, los mensajes manuales a una clase y los correos de cuenta del equipo, como el restablecimiento de contraseña.

## Configurar PocketBase

1. En el proveedor SMTP, autoriza la dirección o el dominio remitente y obtén el host, puerto, modo de cifrado y credenciales. Si el proveedor pide registros DNS para verificar el dominio o autenticar los envíos, publica los valores que indique. Comprueba que el servidor de PocketBase pueda abrir conexiones salientes al puerto SMTP.
2. Entra como superusuario al panel `/_/` de PocketBase. En **Ajustes → Correo** (**Settings → Mail settings**), guarda la dirección y el nombre del remitente, activa SMTP y completa estos campos. Los ajustes se guardan en la instancia de PocketBase. Las credenciales se introducen en ese panel y deben quedar fuera del repositorio. [Configuración de correo en PocketBase](https://pocketbase.io/docs/going-to-production/#use-smtp-mail-server)

   | Campo | Valor |
   | --- | --- |
   | Dirección del remitente (`meta.senderAddress`) | Dirección autorizada por el proveedor, por ejemplo `avisos@example.com`. Se comparte entre los negocios de la instancia. |
   | Nombre del remitente (`meta.senderName`) | Nombre visible para los correos nativos de PocketBase. Los avisos a clientes usan el nombre de su negocio. |
   | Host y puerto | Nombre del servidor sin `https://` y puerto indicado por el proveedor. |
   | Usuario y contraseña | Credenciales SMTP del proveedor. Déjalos vacíos si el relay está configurado para aceptar conexiones sin autenticación. |
   | Método de autenticación | `PLAIN` por defecto. Selecciona `LOGIN` si el proveedor lo requiere. |
   | TLS | Actívalo para TLS implícito, común en el puerto `465`. Para STARTTLS, común en el puerto `587`, deja desactivada esa casilla. PocketBase intenta elevar la conexión a TLS si el servidor ofrece STARTTLS. |
   | Nombre local (`smtp.localName`) | Déjalo vacío salvo que el relay exija un nombre específico para `EHLO`/`HELO`. |

   [Implementación SMTP de PocketBase 0.40.5](https://github.com/pocketbase/pocketbase/blob/v0.40.5/tools/mailer/smtp.go)

3. En **Ajustes → Aplicación**, fija la URL de PocketBase (`meta.appURL`) a la URL HTTPS que pueda abrir el equipo. La plantilla de recuperación de `admins` usa esa URL para enlazar a `/_/#/auth/confirm-password-reset/{TOKEN}`. [Plantilla de recuperación de `admins`](../api/pb_migrations/1795260843_created_admins.js)
4. En la app, como `owner`, abre **Ajustes → Negocio**. Confirma el nombre visible, el teléfono que se puede insertar en las plantillas y el correo que debe recibir las respuestas. El motor añade el correo del negocio como `Reply-To` si es válido. Comprueba que el negocio esté activo y tenga la zona horaria y moneda correctas. [Configuración del negocio](multi-tenancy.md#dar-de-alta-un-negocio)

### Anticipación de los avisos

Estos valores son opcionales y se aplican a todos los negocios de la instancia. Define las variables en el entorno del proceso que ejecuta PocketBase. En desarrollo, `bun run dev` en `api/` carga `api/.env` al iniciar PocketBase. Si cambias el entorno, reinicia ese proceso para aplicar los valores. Cada variable acepta un entero positivo y usa el valor por defecto si está vacía o es inválida.

| Variable | Por defecto | Uso |
| --- | --- | --- |
| `MESSAGES_REMINDER_HOURS` | `24` | Horas de anticipación para el recordatorio de clase. |
| `MESSAGES_DUE_DAYS_BEFORE` | `3` | Días de anticipación para el aviso de cobro pendiente. |
| `MESSAGES_RENEWAL_DAYS_BEFORE` | `5` | Días de anticipación para el aviso de fin de período de la membresía. |

## Qué correos se envían

| Aviso | Cuándo se genera |
| --- | --- |
| Confirmación de reserva (`booking_confirmed`) | Al guardar una reserva nueva en estado `booked`. |
| Promoción de lista de espera (`waitlist_promoted`) | Al cambiar una reserva de `waitlisted` a `booked`. |
| Cancelación o cambio de clase (`class_cancelled`) | Al cancelarse una clase, para las reservas confirmadas o en espera que se cancelan con ella. La misma plantilla avisa a ambos grupos si se cambia la hora o el coach de una clase programada. |
| Recordatorio (`class_reminder`) | Cada 15 minutos, `class_reminders` busca reservas confirmadas cuyas clases programadas empiezan dentro de la ventana configurada. |
| Cobro pendiente (`payment_due`) | `payment_due_notices` corre cada hora y selecciona, durante la hora local de las 09:00, los cobros `pending` que vencen en la fecha objetivo. |
| Renovación (`membership_renewal`) | `renewal_notices` corre cada hora y selecciona, durante la hora local de las 09:00, las membresías activas cuyo período termina en la fecha objetivo. |

Los hooks de reserva y clase actúan después de guardar el cambio con éxito. Los crons vienen registrados en los hooks compilados y corren dentro del proceso `serve` de PocketBase. Se pueden inspeccionar en **Ajustes → Crons**. Los procesos automáticos se aplican a negocios activos, y los avisos fechados calculan la fecha objetivo sumando los días configurados a la fecha local de cada negocio. [Hooks de avisos](../api/src/hooks/messages-triggers.ts) · [Tareas programadas de PocketBase](https://pocketbase.io/docs/js-jobs-scheduling/)

### Destinatarios y plantillas

- Para recibir un aviso operativo, el cliente debe tener un correo válido y estar **Activo** o **En pausa**. Edita su idioma en **Clientes → Datos → Idioma de comunicaciones**. El valor predeterminado es español.
- En **Operaciones → Comunicaciones → Plantillas**, el `owner` puede editar y activar o desactivar cada versión. Al crear un negocio se inicializan seis plantillas en español y seis en inglés. Si falta la versión del idioma preferido, se busca la del otro idioma. Si la versión preferida existe y está desactivada, se omite el aviso para ese idioma.
- Escribe asunto y cuerpo en texto plano. La API admite variables como `{{client_first_name}}`, `{{studio_name}}` y, según el aviso, `{{class_time}}` o `{{amount}}`. El editor muestra las permitidas. El asunto admite hasta 150 caracteres en una línea y el cuerpo hasta 5000 caracteres. PocketBase envía texto plano y HTML escapado. Las horas de clase se muestran en la zona del negocio y los importes usan su moneda. [Variables por plantilla](../api/src/lib/message-render.ts)

### Mensaje manual y correos de cuenta

En **Operaciones → Comunicaciones → Mensaje a clase**, un `owner`, `coach` o usuario de recepción activo puede seleccionar una clase futura programada, revisar los destinatarios, previsualizar el texto y confirmar el envío. El límite se calcula sobre las reservas confirmadas y en espera de la clase y es de 200. El envío intenta una vez por destinatario elegible y devuelve los totales enviados, fallidos y omitidos. El historial guarda el resultado por intento y el contenido manual se usa durante la solicitud.

Desde **¿Olvidaste tu contraseña?**, un integrante del equipo solicita la recuperación de su cuenta de `admins`. PocketBase usa la plantilla de recuperación de esa colección y su propio remitente de instancia. Los correos nativos de cuenta se gestionan en PocketBase. El historial de **Comunicaciones** corresponde a los envíos operativos a clientes. [Solicitud de recuperación en la app](../app/src/composables/useAuth.ts)

## Historial y reintentos

**Operaciones → Comunicaciones → Historial** muestra los intentos del negocio. En PocketBase, `message_logs` conserva el cliente, la clase si aplica, el tipo de aviso, el estado, el número de intentos y el error genérico. `sent` indica que el servidor SMTP aceptó el mensaje. Para comprobar la entrega final o un rebote, consulta al proveedor SMTP. Los avisos omitidos antes de intentar el envío quedan fuera del historial.

Una clave por negocio y evento evita repetir avisos automáticos cuando un cron vuelve a evaluar el mismo registro. Si falla SMTP, el primer reintento queda disponible a los 5 minutos y el segundo a los 30 minutos del intento anterior. `retry_failed_messages` revisa la cola cada 10 minutos y realiza como máximo tres intentos totales. Antes de reintentar, comprueba que el aviso siga vigente y vuelve a cargar el destinatario, la plantilla y el contexto. Los errores de renderizado y los mensajes manuales quedan fuera de la cola. Si el proceso se interrumpe entre la aceptación SMTP y el registro del resultado, un reintento puede duplicar el correo. [Motor de envío](../api/src/lib/message-send.ts)

## Comprobar la configuración

1. Desde **Ajustes → Correo** en PocketBase, envía la prueba del panel a un buzón controlado y confirma que llega. Esta prueba valida el transporte de la instancia. [Prueba de correo de PocketBase](https://pocketbase.io/docs/api-settings/#send-test-email)
2. Prueba un correo operativo con el token de un `owner` activo de `admins`. Define `PB_URL` con la URL base de la API y `OWNER_TOKEN` con el token de sesión del owner.

   ```bash
   curl -sS --fail-with-body -X POST "$PB_URL/api/admin/messages/test" \
     -H "Authorization: $OWNER_TOKEN" \
     -H 'Content-Type: application/json' \
     --data '{"key":"booking_confirmed","locale":"es"}'
   ```

   Debe devolver `{"sent":true}`. El correo usa la plantilla guardada del negocio con datos de ejemplo y se envía al correo del owner autenticado. Esta prueba queda fuera de `message_logs`. Revisa el nombre del remitente y la dirección de respuesta. [Ruta de prueba](../api/src/lib/message-admin.ts)
3. En una instancia de pruebas, crea una reserva confirmada para un cliente activo con un buzón controlado y verifica el resultado en **Historial**. Prueba también **¿Olvidaste tu contraseña?** con una cuenta de prueba y comprueba que el enlace abre la URL configurada en PocketBase.

Para comprobar los avisos sin enviar correos a Internet, ejecuta `bash scripts/verify-api.sh` desde la raíz. Usa una instancia temporal de PocketBase y un servidor SMTP de captura en localhost. Necesita Bun, el binario `api/pb` y permiso para abrir puertos locales. [Verificador de comunicaciones](../scripts/verify-messages.ts)

### Si no llega un correo

| Síntoma | Qué revisar |
| --- | --- |
| `El correo no está configurado` | En PocketBase, comprueba que SMTP esté activo y tenga host y dirección de remitente. |
| `No se pudo enviar por SMTP.` | Revisa conectividad desde el servidor, puerto, TLS, credenciales y autorización del remitente. Usa la prueba del panel y los registros del proveedor para buscar el detalle. |
| El aviso automático no aparece en el historial | Comprueba el evento y el estado del registro, el correo y estado del cliente, la plantilla para su idioma y que el negocio esté activo. Para avisos programados, confirma que el cron esté cargado y revisa la zona y la ventana de envío. |
| Figura como `sent` pero no llegó al buzón | Busca el envío o rebote en el proveedor y revisa la carpeta de spam y la autenticación del dominio. |
| El enlace de recuperación abre la dirección equivocada | Revisa `meta.appURL` y la plantilla de recuperación en la colección `admins`. |
