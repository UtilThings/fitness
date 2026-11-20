# 015 - [Web] Componente `LeadForm` (isla Vue)

- **Prioridad:** 15
- **Estado:** Completado
- **Depende de:** 001, 007
- **Fase:** Fase 4: Páginas interactivas

## Objetivo

Existe un formulario reutilizable que valida los campos obligatorios con la validación nativa del navegador y, al enviarse, muestra un mensaje de confirmación sin hacer ninguna petición.

## Contexto

El original tiene dos formularios con el mismo comportamiento: `onSubmit` hace `preventDefault()` y cambia un estado a "enviado", que reemplaza los campos por un párrafo `text-primary`. Estilo de campos: `w-full rounded-lg border border-input bg-background px-4 py-3 outline-none focus:border-primary` (los `select` no llevan `outline-none focus:border-primary`). Contenedor: `form.card-surface.space-y-4.p-7`. Esta feature no integra backend, así que el envío es solo local; una feature posterior reemplazará el manejador.

## Alcance

- Crear `web/src/components/LeadForm.vue` (`<script setup lang="ts">`) con props:
  - `title?: string` (si existe, se muestra como `h2.text-3xl` dentro del formulario, también tras enviar).
  - `fields: Field[]` donde `Field` es `{ kind: 'text' | 'email' | 'select' | 'textarea'; placeholder?: string; required?: boolean; options?: string[]; rows?: number }`.
  - `submitLabel: string` y `successMessage: string`.
  - Emite el evento `submitted` (sin payload) al enviar, para que una feature futura pueda conectar el envío real. El componente no registra valores con `console`.
- Cada campo es un control con `placeholder` y `aria-label` igual al placeholder (en `select`, `aria-label` con la etiqueta recibida o la primera opción si falta). Botón `btn btn-primary w-full` con `submitLabel`.
- Pruebas `web/src/components/LeadForm.test.ts`: renderiza los campos indicados; los campos `required` llevan el atributo; al enviar, los campos desaparecen y se muestra `successMessage`; el título permanece; no se llama a `fetch` (espiar `globalThis.fetch`).
- Límites: sin envío a la red ni almacenamiento de datos.

## Criterios de aceptación

- [x] Con 2 campos obligatorios, un campo opcional, un `select` y un `textarea`, se renderizan los 5 controles con los atributos `required` correctos.
- [x] `form.requestSubmit()` con campos válidos oculta los campos y muestra el mensaje de confirmación.
- [x] `fetch` no se invoca (prueba automatizada) y no hay `console.log` de valores.
- [x] El HTML de SSR contiene el formulario sin errores.
- [x] `bun run lint`, `bun run format:check`, `bun run check`, `bun run test` y `bun run build` pasan en verde.

## Referencias

- `features/002-web-replica-lovable/spec.md`, "Fase 4" → tarea 015.
- `features/002-web-replica-lovable/reference/html/contact.html` y `online-coaching.html`.
- https://vuejs.org/guide/essentials/forms.html

## Fuera de alcance

- Integración con la API (feature futura).
- Las páginas que lo usan (tareas 016 y 017).

## Notas de implementación

<!-- Vacío al crear la tarea. -->
