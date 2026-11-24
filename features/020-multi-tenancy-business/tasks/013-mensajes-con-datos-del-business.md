# 013 - [Módulo] Mensajes con datos del business

- **Prioridad:** 13
- **Estado:** Pendiente
- **Depende de:** 007
- **Fase:** Fase 2: Zona horaria, moneda y mensajes por business

## Objetivo

Los mensajes del servicio usan nombre, teléfono y remitente del business del destinatario.

## Contexto

`message-send.ts` y `message-admin.ts` leen `STUDIO_NAME` y `STUDIO_PHONE` del entorno (`studio_name`, `studio_phone`). Las plantillas ya son por business (005).

## Alcance

- Reemplazar la lectura de entorno por `getBusinessContext(app, businessId)` en `message-context.ts` (nombre, teléfono, email, ciudad).
- Plantillas, vista previa, mensaje manual y envío de prueba filtran plantillas y logs por business; `dedupe_key` incluye el business.
- Retirar `STUDIO_NAME`/`STUDIO_PHONE` del código, de `scripts/verify-api.sh` y de la documentación (la migración 002 los usó una sola vez).
- Pruebas: `message-render.test.ts` y `message-policy.test.ts` con dos business.

## Criterios de aceptación

- [ ] Un mensaje de A muestra el nombre y teléfono de A; uno de B, los de B.
- [ ] Las plantillas editadas en A no afectan a B.
- [ ] Ninguna referencia a `STUDIO_NAME`/`STUDIO_PHONE` fuera de la migración 002 y su documentación.
- [ ] `bun run build:ts` y `bun test` pasan en verde.

## Fuera de alcance

- Configuración de SMTP por business (los mensajes salen por el SMTP de la instancia).

## Referencias

- `features/020-multi-tenancy-business/spec.md`, sección "Fase 2: Zona horaria, moneda y mensajes por business" → tarea 013.
- `api/src/lib/message-send.ts`, `api/src/lib/message-admin.ts`

## Notas de implementación

<!-- Vacío al crear la tarea. Al completarla, registra archivos creados/modificados, decisiones, desviaciones y hallazgos pendientes. -->
