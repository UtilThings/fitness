# 009 - [Verificación] Pruebas de integración, documentación y cierre

- **Prioridad:** 9
- **Estado:** Pendiente
- **Depende de:** 001, 002, 003, 004, 005, 006, 007, 008
- **Fase:** Fase final: Verificación y cierre

## Objetivo

El flujo completo de mensajes está verificado de extremo a extremo, documentado y la feature queda marcada como completada.

## Contexto

`scripts/verify-api.sh` (005) y `scripts/verify-app.sh` (003) agrupan las comprobaciones del proyecto; las tareas 004-006 ya añadieron las suyas. Para probar el envío sin enviar correos reales se necesita un servidor SMTP de captura local (p. ej. `mailpit` en Docker o `bun` con un servidor mínimo) configurado en los ajustes de PocketBase de un entorno de prueba.

## Alcance

- Añadir a `scripts/verify-api.sh` un bloque opcional (si hay SMTP de captura disponible, en caso contrario se omite con aviso) que: crea cliente `es` y `en`, crea reservas y comprueba confirmación en cada idioma, marca un cliente `inactive` y comprueba que no se envía, apaga el SMTP y comprueba `failed` con `next_retry_at`.
- `api/README.md`: sección «Comunicaciones del servicio» con configuración SMTP (Ajustes > Correo), variables `MESSAGES_*`, `STUDIO_NAME`, `STUDIO_PHONE`, lista de plantillas y variables permitidas, política de elegibilidad, reintentos y cómo añadir un canal (SMS) mediante `MessageChannel`.
- `app/README.md`: sección «Comunicaciones» (editor, historial, mensaje a clase, permisos).
- Ejecutar `cd api && bun run build:ts && bun test`, `scripts/verify-api.sh` y `scripts/verify-app.sh`; corregir lo que falle dentro del alcance de la feature.
- Marcar `- **Estado:** Completado` en `spec.md` y en cada tarea, y los criterios cumplidos.

## Criterios de aceptación

- [ ] Ambos README describen la configuración y el funcionamiento reales, incluido el punto de extensión de SMS y la exclusión explícita de marketing.
- [ ] `scripts/verify-api.sh` y `scripts/verify-app.sh` terminan en verde.
- [ ] La verificación con SMTP de captura confirma idioma por cliente, no envío a inactivos y reintento tras fallo.
- [ ] Se comprueba manualmente que un nombre de cliente con HTML llega escapado en el correo.
- [ ] El spec y las tareas reflejan el estado real (Completado) y sus notas de implementación.

## Referencias

- `features/018-comunicaciones-del-servicio/spec.md`, sección "Fase final" → tarea 009, y "Validación Post-Deploy".

## Fuera de alcance

- Nuevos canales o tipos de mensaje.

## Notas de implementación

