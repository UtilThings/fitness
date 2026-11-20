# 005 - [Web] Header con selector de idioma y menú móvil (isla Vue)

- **Prioridad:** 5
- **Estado:** Completado
- **Depende de:** 001, 004
- **Fase:** Fase 2: Layout compartido

## Objetivo

Existe un header fijo idéntico al original: en desktop (`xl` o más) muestra el nav completo, y en pantallas menores un botón de menú que despliega los enlaces. En ambos casos incluye el selector EN/ES funcional.

## Contexto

Depende de los tokens (001) y del diccionario (004). El original renderiza: `header` `sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur`; contenedor `mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5`; logo (imagen `h-10 w-auto` y texto `font-display text-2xl uppercase tracking-wide` con "Fitness" en `text-primary`); `nav` `hidden items-center gap-5 xl:flex`; a la derecha selector de idioma, botón "Book your class" (`btn btn-primary hidden !px-4 !py-2 sm:inline-flex`, enlace a `/schedule`) y botón hamburguesa `xl:hidden` con `aria-label="Menu"`. Menú móvil: `nav` `flex flex-col gap-1 border-t border-border px-5 py-4 xl:hidden`, enlaces `py-2 font-display text-xl uppercase`, se cierra al pulsar un enlace.

## Alcance

- Crear `web/src/lib/use-lang.ts`: composable de Vue con estado compartido a nivel de módulo (`ref<Lang>('en')`), `setLang(lang)` que actualiza el estado, guarda con `storeLang(localStorage, lang)` y despacha `LANG_EVENT` en `window`, `t(key)` y `initLang()` (se llama en `onMounted`, lee `readStoredLang`). Escucha `LANG_EVENT` para sincronizar si otro componente cambia el idioma.
- Crear `web/src/components/Header.vue` (`<script setup lang="ts">`), prop `currentPath: string`:
  - Enlaces (clave i18n → ruta): `personal` → `/personal-training`, `group` → `/group-strength-training`, `jump` → `/tropical-jump`, `online` → `/online-coaching`, `schedule` → `/schedule`, `pricing` → `/pricing`, `about` → `/about`, `contact` → `/contact`.
  - Clase por defecto `text-sm font-semibold text-muted-foreground hover:text-foreground`; el enlace activo (`currentPath` igual a la ruta) usa `text-primary`. El logo enlaza a `/` con `aria-label="JQ Fitness — home"` y la imagen tiene `alt="JQ Fitness logo"`.
  - Selector: dos botones `en` y `es` en `div` `flex rounded-full border border-border p-0.5 text-xs font-bold`; botón `rounded-full px-2.5 py-1 uppercase`, activo con `bg-primary text-primary-foreground`, inactivo `text-muted-foreground`.
  - Menú hamburguesa y cierre con SVG en línea (iconos tipo "menu" y "x" de 24 px, `stroke="currentColor"`).
  - La imagen del logo llega como prop `logoSrc: string` (el layout la importa de `@/assets/jq-logo.png`).
- Pruebas `web/src/components/Header.test.ts` (Vue Test Utils + happy-dom): el menú está cerrado al inicio y se abre y cierra con el botón `Menu`; pulsar un enlace del menú lo cierra; el enlace con `currentPath` lleva `text-primary`; pulsar `es` cambia "Schedule" por "Horario", guarda `jq-lang=es` y despacha `jq-lang-change`.
- Límites: sin integración en el layout (tarea 006).

## Criterios de aceptación

- [x] Con `currentPath="/pricing"` el enlace "Pricing" tiene `text-primary` y los demás no.
- [x] El botón `Menu` muestra y oculta los 8 enlaces del menú móvil y el menú se cierra al pulsar un enlace.
- [x] Al pulsar `ES`, los textos del header pasan al español y `localStorage['jq-lang']` vale `es`; al montar de nuevo con ese valor guardado, el header arranca en español.
- [x] El HTML renderizado en servidor contiene el logo, los 8 enlaces del nav y los dos botones de idioma (SSR sin errores).
- [x] `bun run lint`, `bun run format:check`, `bun run check`, `bun run test` y `bun run build` pasan en verde.

## Referencias

- `features/002-web-replica-lovable/spec.md`, "Fase 2" → tarea 005.
- `features/002-web-replica-lovable/reference/html/home.html` (marcado del header).
- https://vuejs.org/guide/reusability/composables.html

## Fuera de alcance

- Footer y layout (tarea 006).
- Botón "Client Login": la clave `login` existe en el diccionario pero el original no la muestra.

## Notas de implementación

<!-- Vacío al crear la tarea. -->
