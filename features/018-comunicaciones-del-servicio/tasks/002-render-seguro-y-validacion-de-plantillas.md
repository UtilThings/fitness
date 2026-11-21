# 002 - [Lib] Render seguro y validación de plantillas

- **Prioridad:** 2
- **Estado:** Pendiente
- **Depende de:** Ninguna
- **Fase:** Fase 2: Lógica pura

## Objetivo

Existe una librería pura que valida plantillas contra la lista de variables permitidas por clave y las renderiza con escape HTML, sin posibilidad de inyección de HTML ni de cabeceras en el asunto.

## Contexto

Las librerías puras viven en `api/src/lib/*.ts`, compilan a CJS en `pb_hooks/lib/` y se prueban con `bun test` (script añadido por 005). Los hooks hacen `require` dentro de cada callback. Las variables permitidas por clave están en el spec. Los textos los edita el staff, pero los valores (nombre de cliente, motivo de cancelación) pueden contener HTML.

## Alcance

- Crear `api/src/lib/message-render.ts` con `ALLOWED_VARIABLES` (por clave y comunes), `extractVariables(text)` (sintaxis `{{nombre}}`, espacios tolerados), `validateTemplate({ key, subject, body })` → lista de problemas (variable no permitida, plantilla vacía, longitudes, saltos de línea en el asunto), `renderText(text, vars)` y `renderHtml(body, vars)`.
- Escape de cada valor (`& < > " '`) antes de insertarlo en HTML; el cuerpo de la plantilla también se escapa y luego se convierte en párrafos y `<br>`; el asunto se renderiza como texto plano y se rechaza si el resultado contiene `\r` o `\n`.
- Variable permitida pero sin valor en el contexto → error explícito (nunca `undefined` ni `null` en el texto).
- Formateadores `formatDate`, `formatTime`, `formatMoneyCents` con nombres de mes y día en es/en sin `Intl` (hora local con el helper de 009 o `business-time.ts` de 017 si existe; si no, recibir ya los componentes locales).
- Pruebas `message-render.test.ts`: `<script>` y `"` en valores, `{{` anidado o sin cerrar, variable repetida, variable no permitida, asunto con salto de línea, valor vacío, límites de longitud, fechas en es/en, importes `26800 → $268.00`.

## Criterios de aceptación

- [ ] `renderHtml('Hola {{client_first_name}}', { client_first_name: '<b>Ana</b>' })` contiene `&lt;b&gt;Ana&lt;/b&gt;` y ningún `<b>`.
- [ ] `validateTemplate` rechaza `{{password}}` y variables de otra clave (p. ej. `amount` en `booking_confirmed`).
- [ ] Un asunto cuyo valor renderizado contenga un salto de línea falla.
- [ ] Las fechas se formatean en español («sáb 21 nov, 9:00 AM») e inglés («Sat, Nov 21, 9:00 AM»).
- [ ] `bun test` en `api/` pasa en verde.

## Referencias

- `features/018-comunicaciones-del-servicio/spec.md`, sección "Fase 2" → tarea 002, y "Variables permitidas por clave".
- https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html

## Fuera de alcance

- Envío y registro (004).
- Vista previa HTTP (006) y editor (007).

## Notas de implementación

