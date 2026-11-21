# 007 - [Componente] Composable y editor de plantillas

- **Prioridad:** 7
- **Estado:** Pendiente
- **Depende de:** 002, 006, Feature 006 (contrato)
- **Fase:** Fase 4: Interfaz

## Objetivo

El owner edita plantillas con una lista de variables permitidas que se insertan con un clic y una vista previa en vivo y segura.

## Contexto

`app/` usa Vue 3, PrimeVue 5 (Aura) y `pb` de `app/src/lib/pocketbase.ts`. Las variables permitidas por clave están definidas en la API (`message-render.ts`); la UI debe obtenerlas del servidor o de una constante compartida y sincronizada por prueba, no inventarlas. Textos de UI en español.

## Alcance

- Crear `app/src/composables/useMessageTemplates.ts`: lista de plantillas (`pb.collection('message_templates')`), `save(template)`, `preview(template)` con debounce de 300 ms hacia `POST /api/admin/messages/preview` (cancelando la petición anterior), errores de validación del servidor expuestos por campo.
- Crear `app/src/components/communications/TemplateEditor.vue`: selector de clave y de idioma, `InputText` de asunto, `Textarea` de cuerpo, chips de variables permitidas para la clave que insertan `{{variable}}` en la posición del cursor, vista previa con asunto y cuerpo como **texto** (nunca `v-html` con contenido del usuario), interruptor `active`, botón guardar (`:loading`), modo solo lectura para quien no sea owner.
- Resaltar variables no permitidas detectadas localmente mientras se escribe (la API sigue siendo la validación definitiva).
- Pruebas Vitest: inserción de variable en la posición del cursor, variable no permitida marcada, vista previa tras debounce (temporizadores simulados), error `400` mostrado, modo solo lectura.

## Criterios de aceptación

- [ ] Pulsar un chip inserta `{{class_name}}` en el cursor y actualiza la vista previa.
- [ ] Una variable no permitida muestra un aviso y bloquea el guardado local; el `400` del servidor también se muestra.
- [ ] La vista previa no interpreta HTML: `<script>` en un valor se muestra como texto.
- [ ] Un usuario que no es owner ve el editor en solo lectura.
- [ ] `bun run test`, `lint`, `format:check` y `typecheck` en `app/` pasan.

## Referencias

- `features/018-comunicaciones-del-servicio/spec.md`, sección "Fase 4" → tarea 007.
- https://primevue.org/textarea/

## Fuera de alcance

- Vista con pestañas, historial y mensaje a clase (008).
- Editor HTML enriquecido (las plantillas son texto plano).

## Notas de implementación

