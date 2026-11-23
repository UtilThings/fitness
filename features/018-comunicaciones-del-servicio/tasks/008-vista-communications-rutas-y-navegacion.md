# 008 - [Vista] `/communications`: plantillas, historial y mensaje a clase

- **Prioridad:** 8
- **Estado:** Completado
- **Depende de:** 001, 006, 007, Feature 006 (contrato), Feature 010 (contrato)
- **Fase:** Fase 4: Interfaz

## Objetivo

El staff consulta el historial de envíos, el owner edita las plantillas y cualquier staff envía un mensaje manual a los inscritos de una clase; el idioma del cliente se puede elegir en su ficha.

## Contexto

Las vistas viven en `app/src/views/admin/*View.vue`; las rutas protegidas son hijas de `AdminLayout` (`meta.requiresAuth`, `meta.title`); la navegación está solo en `app/src/layouts/admin-nav.ts`. El formulario de clientes y la lista de clases próximas provienen de 010 y 009/011 (solo por contrato); `message_logs` es de solo lectura por API (listRule staff).

## Alcance

- Crear `app/src/views/admin/CommunicationsView.vue` con `Tabs`: **Plantillas** (lista por clave e idioma, abre `TemplateEditor`), **Historial** (`DataTable` paginado de `message_logs` con cliente expandido, filtros por estado, clave y rango de fechas en hora de Miramar, FL; botón de actualizar; muestra intentos y error), **Mensaje a clase** (selector de clases próximas, lista de destinatarios con conteo, asunto/cuerpo, vista previa, diálogo de confirmación, resultado `sent/failed/skipped`).
- Añadir el selector de idioma (`clients.locale`, «Español»/«English») al formulario de clientes de 010.
- `app/src/router/index.ts`: ruta `communications` hija de `AdminLayout` con `meta.requiresAuth` y `meta.title = 'Comunicaciones'`; `admin-nav.ts`: entrada «Comunicaciones» (`pi pi-envelope`).
- Pruebas Vitest: pestañas y modo lectura por rol, filtros del historial construyen el filtro de PocketBase con parámetros, el envío manual exige confirmación y muestra el resultado, `router/index.test.ts` y `admin-nav.test.ts` actualizados.

## Criterios de aceptación

- [x] `/communications` sin sesión redirige a `/login?redirect=%2Fcommunications`.
- [x] El historial muestra fecha local, cliente, clave, estado y error, filtra y pagina.
- [x] Solo el owner puede guardar plantillas; reception y coach las ven en solo lectura.
- [x] El mensaje a clase requiere confirmación, muestra cuántos recibirán y cuántos se omiten, y no permite enviar con asunto o cuerpo vacíos.
- [x] El formulario de clientes guarda `locale` y la próxima confirmación sale en ese idioma.
- [x] `bun run test`, `lint`, `format:check`, `typecheck` y `build` en `app/` pasan.

## Referencias

- `features/018-comunicaciones-del-servicio/spec.md`, sección "Fase 4" → tarea 008.
- `app/src/layouts/admin-nav.ts`, `app/src/router/index.ts`.
- https://primevue.org/datatable/

## Fuera de alcance

- Difusiones a clientes que no estén inscritos en la clase.
- Reenvío manual de un log fallido (el reintento es automático).
- SMS y otros canales.

## Notas de implementación

- Vitest comprueba la ruta protegida, los permisos de edición, las fechas locales y la paginación del historial, la confirmación del mensaje y el selector de idioma.
- El cambio de idioma del cliente se verificó en PocketBase y en el mensaje recibido por SMTP de captura. `scripts/verify-app.sh` pasó completa.
