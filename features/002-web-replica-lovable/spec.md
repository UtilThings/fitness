# Especificación: Réplica del sitio Lovable en `web/` (desktop y mobile)

- **Estado:** Completado

## Resumen Ejecutivo

Este conjunto de 22 tareas replica en `web/` (Astro + Vue 3 + Tailwind v4) las 9 páginas del preview de Lovable de JQ Fitness, en desktop y mobile, con el mismo contenido, estilos, interacciones y selector de idioma EN/ES. No replica el panel lateral derecho del editor de Lovable ni la burbuja "Edit with Lovable" del pie (`#lovable-badge`). No implementa backend: los formularios solo muestran el mensaje de confirmación, igual que el original, y la integración con `api/` queda para otra feature.

Entrega:

1. **Sistema de diseño**: tokens oklch (tema oscuro, primario turquesa, acento ámbar), fuentes Anton (títulos) y Barlow (texto), y utilidades `.btn`, `.eyebrow`, `.card-surface`, `.hero-fade`.
2. **Layout compartido**: header fijo con navegación, selector EN/ES y menú móvil; footer; layout base con SEO por página.
3. **9 páginas**: `/`, `/personal-training`, `/group-strength-training`, `/tropical-jump`, `/online-coaching`, `/schedule`, `/pricing`, `/about`, `/contact`, más la 404.
4. **Interactividad en islas Vue**: header, formularios de contacto y de coaching online, y el calendario de clases (filtro por servicio, navegación por semana, cupos).
5. **Verificación**: pruebas unitarias, pruebas del HTML generado por ruta, revisión visual desktop/mobile contra el original, README y `scripts/verify-web.sh` actualizados.

Contrato que deja a las siguientes features: componentes de página reutilizables (`PageHero`, `Section`, `CtaBand`, `PricingCard`, `PolicyCard`), datos de negocio en `web/src/lib/data.ts`, diccionario en `web/src/lib/i18n.ts` y tokens de diseño en `global.css`. Las features que conecten formularios o reservas a `api/` reemplazan el `onSubmit` local de `LeadForm.vue` y los datos de `data.ts`.

---

## Estado actual del repositorio (punto de partida)

| Elemento | Estado |
|----------|--------|
| `web/` | Boilerplate de la feature 001 (completada): Astro 7, `@astrojs/vue`, Tailwind v4 (`@tailwindcss/vite`), alias `@/*`, ESLint, Prettier, `astro check`, Vitest + happy-dom |
| `web/src/styles/global.css` | Solo `@import 'tailwindcss'` y `@theme` con `--font-sans: system-ui` y `--color-primary: #0f766e` provisionales |
| `web/src/layouts/BaseLayout.astro` | Existe, pero centra el contenido (`grid place-items-center`, fondo `slate-50`); no sirve para el diseño nuevo |
| `web/src/pages/` | `index.astro` (demo con `Counter`) y `404.astro` (estilo provisional) |
| `web/src/components/` | `Counter.vue` y `Counter.test.ts` (demo de la isla; se retira) |
| `web/src/lib/` | `env.ts` y `env.test.ts` (variables `PUBLIC_*` validadas; se conservan) |
| `web/public/` | `favicon.ico` y `favicon.svg` del boilerplate |
| `scripts/verify-web.sh` | Ejecuta install, lint, format:check, check, test y build |
| Fuente del diseño | Preview de Lovable (privado, el token caduca el 2026-11-23). Snapshot local en `features/002-web-replica-lovable/reference/` (HTML del `<body>` de las 9 rutas, sin `<head>`, y los assets originales; las meta descriptions están en cada tarea de página) |

El original es una SPA de React (TanStack Router) con Tailwind v4. Sus clases se pueden reutilizar casi literalmente porque `web/` usa el mismo Tailwind v4.

> Verificación obligatoria previa: la tarea 001 debe comprobar con `npm view` la versión vigente de `@fontsource/anton` y `@fontsource/barlow`, y comprobar en `reference/html/*.html` que las clases y los textos coinciden con lo descrito aquí antes de copiarlos.

---

## Contrato de rutas

| Ruta | Archivo Astro | Título (`<title>`) |
|------|---------------|--------------------|
| `/` | `pages/index.astro` | JQ Fitness — Stronger Every Day \| Miramar, FL |
| `/personal-training` | `pages/personal-training.astro` | Personal Training \| JQ Fitness Miramar |
| `/group-strength-training` | `pages/group-strength-training.astro` | Group Strength Training \| JQ Fitness |
| `/tropical-jump` | `pages/tropical-jump.astro` | Tropical Jump Trampoline Classes \| JQ Fitness |
| `/online-coaching` | `pages/online-coaching.astro` | Online Coaching Programs \| JQ Fitness |
| `/schedule` | `pages/schedule.astro` | Class Schedule \| JQ Fitness |
| `/pricing` | `pages/pricing.astro` | Pricing & Packages \| JQ Fitness |
| `/about` | `pages/about.astro` | About JQ Fitness \| Miramar Boutique Studio |
| `/contact` | `pages/contact.astro` | Contact JQ Fitness \| Miramar, FL |
| (otras) | `pages/404.astro` | Page not found |

El contenido visible se mantiene en **inglés** (idioma del original). Solo el diccionario del selector EN/ES se traduce, igual que en Lovable. El `<html lang>` es `en`.

## Tokens de diseño

Definidos en `:root` y expuestos a Tailwind con `@theme inline` (nombres: `background`, `foreground`, `surface`, `card`, `primary`, `primary-foreground`, `accent`, `accent-foreground`, `muted-foreground`, `border`, `input`, `destructive`, `ring`).

| Token | Valor |
|-------|-------|
| `--radius` | `.75rem` |
| `--background` | `oklch(18% .01 240)` |
| `--foreground` | `oklch(98% 0 0)` |
| `--surface` | `oklch(22% .012 240)` |
| `--card` | `oklch(23% .012 240)` |
| `--primary` / `--ring` | `oklch(81% .15 178)` |
| `--primary-foreground` / `--accent-foreground` | `oklch(18% .01 240)` |
| `--accent` | `oklch(83% .17 88)` |
| `--muted` / `--secondary` | `oklch(28% .012 240)` |
| `--muted-foreground` | `oklch(72% .01 240)` |
| `--destructive` | `oklch(65% .22 27)` |
| `--border` | `oklch(100% 0 0 / .1)` |
| `--input` | `oklch(100% 0 0 / .15)` |
| `--gradient-fade` | `linear-gradient(180deg, transparent 0%, color-mix(in oklab, var(--background) 70%, transparent) 55%, var(--background) 100%)` |
| `--shadow-glow` | `0 20px 50px -20px color-mix(in oklab, var(--primary) 55%, transparent)` |
| `--font-sans` | `"Barlow", system-ui, sans-serif` |
| `--font-display` | `"Anton", "Impact", sans-serif` |

Utilidades de componente: `.btn` (pill, `letter-spacing:.08em`, mayúsculas, `padding:.9rem 1.6rem`, `font-size:.85rem`, `font-weight:700`, transición .25s), `.btn-primary` (fondo primario + `--shadow-glow`; hover `brightness(1.08)` y `translateY(-2px)`), `.btn-outline` (borde `1.5px` foreground), `.btn-accent`, `.eyebrow` (primario, `letter-spacing:.25em`, mayúsculas, `.75rem`, 700), `.card-surface` (fondo card, borde 1px, `radius-xl`), `.hero-fade`. Base: `h1,h2,h3` con `font-family: var(--font-display)`, mayúsculas, `letter-spacing:.01em`, `line-height:.95`, tamaño y peso heredados.

## Contrato de datos

`web/src/lib/data.ts` exporta `personalOneOnOne`, `personalPartner`, `groupPlans`, `jumpPlans` (`{ name, price, unit, sessions, freq, note? }`), `classTemplates` (`{ day, time, service, coach, capacity }`) y `availability(spotsLeft)` → `'full' | 'almost' | 'available'`. Valores literales en la tarea 003.

`web/src/lib/i18n.ts` exporta el diccionario `{ en, es }` con 26 claves, `type Lang = 'en' | 'es'`, `STORAGE_KEY = 'jq-lang'` y funciones puras `translate(lang, key)`, `readStoredLang(storage)`, `storeLang(storage, lang)`.

---

## Arquitectura de Cambios

### Fase 1: Fundamentos (Tareas 001-004)

**001 - Tokens de diseño, fuentes y utilidades globales**
- Instalar `@fontsource/anton` y `@fontsource/barlow` (pesos 400, 500, 600, 700) y importarlos en `global.css`; se autoalojan en lugar de usar Google Fonts.
- Reescribir `web/src/styles/global.css` con los tokens, `@theme inline`, capa base y utilidades de la sección "Tokens de diseño".

**002 - Assets de imagen y favicon**
- Copiar `reference/assets/{hero,personal,group,jump}.jpg` a `web/src/assets/` (se procesan con `astro:assets`), `jq-logo.png` a `web/src/assets/` y `favicon.png` a `web/public/`.
- Referenciar `favicon.png` en el layout (el `favicon.svg` del boilerplate deja de usarse y se elimina).

**003 - Datos de negocio tipados**
- Crear `web/src/lib/data.ts` con planes, plantillas de clases y `availability`, más `data.test.ts`.

**004 - Diccionario i18n y script cliente**
- Crear `web/src/lib/i18n.ts` (diccionario y funciones puras), `web/src/components/T.astro` (`<span data-i18n="clave">texto EN</span>`) y `web/src/scripts/i18n-client.ts` que aplica el idioma guardado a todos los `[data-i18n]` y escucha el evento `jq-lang-change`.
- Pruebas en `i18n.test.ts`.

### Fase 2: Layout compartido (Tareas 005-007)

**005 - Header (isla Vue)**
- Crear `web/src/components/Header.vue`: logo, navegación de 8 enlaces (visible desde `xl`), selector EN/ES, botón "Book your class" (desde `sm`) y menú hamburguesa (bajo `xl`). Recibe `currentPath` para marcar el enlace activo. Traduce con el diccionario y emite `jq-lang-change`.

**006 - Footer y layout base**
- Crear `web/src/components/Footer.astro` y reescribir `web/src/layouts/BaseLayout.astro` (head con SEO y Open Graph, `Header`, `<main>`, `Footer`, script i18n). Sin `#lovable-badge`.
- Retirar la demo: eliminar `Counter.vue` y `Counter.test.ts`, y dejar `index.astro` con el layout nuevo (se completa en la 008).

**007 - Componentes de página reutilizables**
- Crear `PageHero.astro`, `Section.astro`, `CtaBand.astro`, `PricingCard.astro` y `PolicyCard.astro`.

### Fase 3: Páginas estáticas (Tareas 008-014)

**008 - Página de inicio `/`** · **009 - `/personal-training`** · **010 - `/group-strength-training`** · **011 - `/tropical-jump`** · **012 - `/pricing`** · **013 - `/about`** · **014 - Página 404**
- Cada una compone los componentes de la Fase 2 con el contenido literal del original y sus metadatos.

### Fase 4: Páginas interactivas (Tareas 015-019)

**015 - Componente `LeadForm.vue`**
- Formulario con campos configurables, validación HTML nativa y mensaje de confirmación al enviar (sin red). Con pruebas.

**016 - `/online-coaching`** · **017 - `/contact`**
- Usan `LeadForm` con los campos y textos de cada original.

**018 - Lógica y componente del calendario**
- `web/src/lib/schedule.ts` (semana, cupos deterministas, filtro) y `web/src/components/ScheduleBoard.vue`. Con pruebas.

**019 - Página `/schedule`**
- Hero y `ScheduleBoard` con `client:only="vue"` (depende de la fecha actual, no se puede prerenderizar sin desajuste de hidratación).

### Fase final: Verificación y cierre (Tareas 020-022)

**020 - Pruebas del HTML generado por ruta**
- Prueba de Vitest que lee `dist/` tras `astro build` y verifica por ruta `<title>`, `<h1>`, enlaces internos válidos y ausencia de `lovable`.

**021 - Revisión visual desktop y mobile**
- Capturas de las 9 rutas a 1440 px y 390 px del original y de la réplica, y corrección de las diferencias.

**022 - Documentación y script de verificación**
- Actualizar `web/README.md` y `scripts/verify-web.sh`.

---

## Impacto por Módulo

| Ruta | Cambio |
|------|--------|
| `web/package.json`, `web/bun.lock` | Dependencias `@fontsource/anton` y `@fontsource/barlow` |
| `web/src/styles/global.css` | Tokens, fuentes y utilidades |
| `web/src/assets/`, `web/public/` | Imágenes, logo y favicon |
| `web/src/lib/` | `data.ts`, `i18n.ts`, `schedule.ts` y sus pruebas (`env.ts` sin cambios) |
| `web/src/components/` | `Header.vue`, `Footer.astro`, `T.astro`, `PageHero`, `Section`, `CtaBand`, `PricingCard`, `PolicyCard`, `LeadForm.vue`, `ScheduleBoard.vue`; se eliminan `Counter.*` |
| `web/src/scripts/` | `i18n-client.ts` |
| `web/src/layouts/BaseLayout.astro` | Reescrito |
| `web/src/pages/` | 9 páginas y la 404 |
| `web/README.md`, `scripts/verify-web.sh` | Documentación y verificación |

---

## Flujos Críticos

### Flujo 1: Visitante en mobile cambia de idioma y navega
```
1. Abre `/` a 390 px → ve logo, selector EN/ES y botón de menú (el nav horizontal está oculto bajo xl)
2. Pulsa "ES" → el diccionario se aplica a nav, hero y CTA; `localStorage['jq-lang'] = 'es'`
3. Abre el menú y pulsa "Precios" → navega a `/pricing`; el menú se cierra
4. Resultado: `/pricing` carga ya en español en los textos del diccionario
```

### Flujo 2: Visitante filtra el horario
```
1. Abre `/schedule` → semana actual, filtro "All", clases agrupadas por día
2. Pulsa "Tropical Jump" → solo se muestran los días con esa clase
3. Pulsa "siguiente semana" → cambia el rango de fechas; "anterior" no baja de la semana actual
4. Resultado: cada tarjeta muestra estado (Available / Almost full / Full) y botón Reserve o Join waitlist hacia `/contact`
```

### Flujo 3: Formulario de contacto
```
1. Visitante deja vacío "Full name" y pulsa "Send message" → la validación nativa lo impide
2. Completa nombre y email válidos y envía → no hay petición de red
3. Resultado: el formulario se reemplaza por "Thanks! We'll get back to you shortly."
```

---

## Notas de Implementación

### Decisiones
- **Astro estático + islas mínimas**: solo `Header`, `LeadForm` y `ScheduleBoard` son islas Vue. El resto es HTML estático. Alternativa descartada: replicar todo como SPA de Vue, que perdería el HTML prerenderizado.
- **i18n sin islas por texto**: los textos traducibles se marcan con `data-i18n` y un script cliente los reemplaza, para evitar decenas de islas. El HTML prerenderizado está en inglés, como en el original, que también cambia el idioma tras montar.
- **Calendario con `client:only="vue"`**: la semana y los cupos dependen de `new Date()`. El original calcula los cupos con `Math.floor((Math.sin(seed) + 1) / 2 * (capacity + 1))` y `seed = timestampDelDía/864e5 + time.length + day`; se replica la misma fórmula para que los números coincidan con el original en la misma fecha.
- **Fuentes autoalojadas** con `@fontsource` en lugar del `<link>` a Google Fonts del original (sin petición a terceros, mejor rendimiento).
- **Clases Tailwind literales del original**: se reutilizan tal cual; las capturas de la tarea 021 detectan desvíos.
- **Se omite** el `#lovable-badge` ("Edit with Lovable"), el script `cdn.gpteng.co/lovable.js` y el panel lateral del editor; nada de esto forma parte del sitio.
- **Claves sin uso en el original** (`home`, `login`, `viewSchedule`, `inquire`) se conservan en el diccionario por fidelidad, pero no se renderizan.

### Convención web
- TypeScript estricto y alias `@/`; la lógica pura vive en `web/src/lib/` y se prueba con Vitest. Los componentes Vue usan `<script setup lang="ts">`.
- Solo `web/src/lib/env.ts` lee variables de entorno.
- Cada tarea deja `bun run lint`, `bun run format:check`, `bun run check`, `bun run test` y `bun run build` en verde.

### Seguridad
- Los formularios no envían datos a ningún sitio en esta feature; no registran los valores en consola.
- Los datos de `localStorage` se validan (solo `en` o `es`) antes de usarlos.
- Ningún token de Lovable se guarda en el repositorio: el spec y las tareas no incluyen el token del enlace original.

### Referencias
- `features/002-web-replica-lovable/reference/html/*.html`: HTML renderizado y limpio de cada ruta del original.
- `features/002-web-replica-lovable/reference/assets/`: imágenes originales.
- https://docs.astro.build/en/guides/imports/ y https://docs.astro.build/en/guides/images/
- https://docs.astro.build/en/guides/framework-components/#hydrating-interactive-components
- https://tailwindcss.com/docs/theme

### Fuera de alcance
- Backend, envío real de formularios, autenticación y reservas reales (el texto "Online booking with accounts is coming soon" se replica tal cual).
- Traducir al español el contenido de las páginas más allá del diccionario del original.
- SEO avanzado (sitemap, robots, datos estructurados) y analítica.
- Animaciones que el original no tiene (la franja "Strength • Energy • …" es texto estático, sin marquesina).

---

## Criterios de Aceptación

- [x] Las 9 rutas y la 404 se generan en `dist/` y su contenido textual coincide con el original.
- [x] A 1440 px y a 390 px el diseño coincide con el original en cada página (revisión de la tarea 021 sin diferencias relevantes).
- [x] El header muestra el nav completo desde `xl` y el menú hamburguesa por debajo; el menú navega y se cierra.
- [x] El selector EN/ES traduce las 26 claves del diccionario y recuerda la elección tras recargar.
- [x] El horario filtra por servicio, navega por semanas (sin bajar de la actual) y muestra los estados y botones correctos.
- [x] Los dos formularios validan los campos obligatorios y muestran el mensaje de confirmación sin hacer peticiones de red.
- [x] Ningún archivo generado contiene `lovable` (badge, scripts o enlaces) ni el token del enlace original.
- [x] `web/README.md` y `scripts/verify-web.sh` reflejan el estado final y el script termina en verde.
- [x] `bun run lint`, `bun run format:check`, `bun run check`, `bun run test` y `bun run build` terminan en verde.

Se verificaron las 9 rutas y la 404 en el build y frente al texto de la referencia local, con 20 pares de capturas a 1440×900 y 390×844 conservados en /tmp/jq-visual/. Chromium comprobó el menú y su punto de quiebre, el idioma persistente, los filtros y la navegación del calendario y la validación y confirmación local de ambos formularios. `scripts/verify-web.sh` finalizó con 35 pruebas unitarias y 12 del sitio compilado en verde.

---

## Dependencias Entre Tareas

```
Feature 001 (boilerplate web)     → 001, 002, 003, 004
001 (tokens y fuentes)            → 005, 006, 007
002 (assets)                      → 006, 007, 008-013
003 (datos)                       → 009-012, 018
004 (i18n)                        → 005, 006, 008, 018
005 (header), 004                 → 006
005 (composable `use-lang`)       → 018
006 (layout), 007 (componentes)   → 008-014
007                               → 015 (estilos de campos), 016, 017, 019
015 (LeadForm)                    → 016, 017
018 (calendario)                  → 019
008-019                           → 020 (pruebas de rutas)
020                               → 021 (revisión visual)
001-021                           → 022 (documentación y verificación)
```

---

## Validación Post-Deploy

1. `bun run lint && bun run format:check && bun run check && bun run test && bun run build` en `web/` en verde.
2. `bun run preview` y abrir cada una de las 9 rutas en desktop y en mobile (DevTools a 390 px): sin scroll horizontal, imágenes visibles, nav correcto.
3. Cambiar a ES, recargar y confirmar que el idioma persiste; en `/contact` enviar el formulario vacío y confirmar que no se envía.
4. `grep -ri lovable web/dist` no devuelve coincidencias.
5. `scripts/verify-web.sh` → todas las comprobaciones en verde.

---

## Prompt y modelo utilizado

### Modelo

Sonnet 5.5

### Prompt

```
Replica en "/web" cada una de las paginas de esta web preview hecha en lovable (desktop y mobile), omitiendo el sidebar derecho y burbuja en el footer de lovable

https://lovable.dev/share-preview/266fa3ee-4e6e-48c4-ab1f-d4ed2b6c1615#preview_url=https%3A%2F%2Fid-preview--266fa3ee-4e6e-48c4-ab1f-d4ed2b6c1615.lovable.app%3F__lovable_token=<token omitido>

El plan que generaras déjalo plasmado en español en features/NNN-.../spec.md, crea las carpetas de ser necesario respetando el consecutivo, puedes usar features/spec-template.md como plantilla. Luego con base en ese spec crea las tareas granulares en features/NNN-.../tasks/NNN-....md, creando un consecutivo ordenado, tasks debidamente priorizadas teniendo en cuenta dependencias resueltas con anterioridad, puedes usar features/task-template.md como plantilla.
```
