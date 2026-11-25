# Especificación: Internacionalización (i18n) del sitio público `web/`

- **Estado:** Pendiente

## Resumen Ejecutivo

Este conjunto de 13 tareas reemplaza el diccionario ad hoc de `web/` (`src/lib/i18n.ts`, ~35 claves camelCase y muchos textos aún fijos en inglés dentro de las páginas) por `vue-i18n` con el mismo enfoque simple que ya usa el admin (feature 021): el **idioma principal es inglés (`en`)**, el texto en inglés es la *key* y el español (`es`) es un catálogo plano `es.json` cargado bajo demanda. **Solo toca `web/`**: no modifica `app/` (ya hecho en 021) ni `api/`, y no traduce el contenido que escribe el negocio (nombres de servicios y planes, notas, ciudad).

Entrega:

1. **Módulo `web/src/i18n/`**: instancia `vue-i18n` (Composition API, `legacy: false`), `locales/es.json`, detección del idioma inicial, carga perezosa de `es`, y un `t` utilizable en componentes Vue, en `lib/` y en el frontmatter de Astro.
2. **Puente para texto estático de Astro**: el sitio es estático (SSG) y solo `Header`, `PricingGrid`, `LeadForm` y `ScheduleBoard` son islas Vue. El texto de `.astro` se renderiza en inglés en el build y un script cliente lo traduce (`<T>`, atributos `data-i18n*`), manteniendo el cambio de idioma instantáneo y sin recargar.
3. **Migración de todo el texto visible** (layout, páginas, componentes, datos de respaldo) a claves en inglés con su traducción al español.
4. **Formato por idioma**: precios, horas, días y fechas dependen del idioma activo; la moneda y la zona horaria siguen viniendo del `business`.
5. **Herramientas de calidad**: script `i18n:check` (claves faltantes/huérfanas, sin literales sueltos), pruebas en ambos idiomas, documentación e integración en `scripts/verify-web.sh`.

Contrato que deja a las siguientes features: todo texto visible nuevo en `web/` se escribe en inglés dentro de `t('…')`, `<T k="…" />` o `tl('…')`, se agrega su traducción a `es.json` y `bun run i18n:check` debe terminar en verde.

> Nota de alcance: la petición original menciona `/app` y luego «solo implementar en `/web`». El admin `app/` ya se internacionalizó en la feature 021 (`features/021-internacionalizacion-app/`); esta feature se aplica únicamente a `web/` y reutiliza sus convenciones.

---

## Estado actual del repositorio (punto de partida)

| Elemento | Estado |
|----------|--------|
| `web/package.json` | Astro 7, `@astrojs/vue`, Vue 3.5, vitest 5 + happy-dom, bun. Sin `vue-i18n` |
| `web/src/lib/i18n.ts` | Diccionario propio `en`/`es` con 35 claves camelCase (`book`, `heroTitle`…), `translate`, `readStoredLang`, `storeLang`. `STORAGE_KEY = 'jq-lang'`, evento `jq-lang-change` |
| `web/src/lib/use-lang.ts` | Composable con `lang` global, `setLang`, `t(key)`; sincroniza islas por evento `window` |
| `web/src/components/T.astro` + `scripts/i18n-client.ts` | `<T k="…">` renderiza `<span data-i18n>` en inglés; el script cliente reemplaza `textContent` al cargar y al cambiar el idioma |
| Texto fijo sin traducción | Casi todo el contenido de las 10 páginas, `Footer`, `PolicyCard`, `LeadForm`, `PricingGrid` (`Most popular`, `Updating…` con `lang === 'es'` inline), `ScheduleBoard` (filtros, `aria-label`), `404`, `title`/`description` de cada página |
| Texto generado en `lib/` | `catalog.ts#toPlans` compone `per 4 weeks`, `8 classes`, `New clients only`…; `data.ts` tiene los mismos textos como respaldo; `formatPrice` devuelve `FREE`; `formatLocalTime` produce `9:00 AM`; `group-strength-training.astro` usa nombres de días en inglés |
| Formato | `formatPrice` usa `en-US`; `ScheduleBoard` ya elige `es-US`/`en-US` para días y mes; `formatRange` recibe `locale` |
| Datos del negocio | `business.name`, `city`, `currency`, `timezone`, nombres de servicios y planes vienen del API (`lib/api.ts`) o de `fallbackBusiness`; **no son idioma de interfaz** |
| Pruebas | `components/*.test.ts`, `lib/*.test.ts` (incl. `lib/i18n.test.ts`) y `tests/dist/*.test.ts`; afirman texto en inglés |
| Scripts | `scripts/verify-web.sh` ejecuta lint, Prettier, `astro check`, pruebas, build, `test:dist` y `test:build:offline` |
| `web/src/i18n/`, `web/scripts/i18n-check.ts`, `docs/` de web | No existen (esta feature los crea). Referencia: `app/src/i18n/index.ts`, `app/scripts/i18n-check.ts`, `docs/i18n.md` |

> Verificación obligatoria previa (tarea 001): comprobar con la versión instalada de `vue-i18n` en un proyecto Astro: compilación de mensajes en el navegador (build completo vs. precompilado) y su peso en el bundle de las islas, `t` compartido entre islas como módulo singleton (con y sin `appEntrypoint` de `@astrojs/vue`), `t` en el frontmatter de Astro durante el build, claves con `.`, `|`, `@`, `{`, `}`, plurales y `fallbackFormat`. El diseño depende de estos resultados.

---

## Contrato de claves y uso

### Convención (decisión central, igual que 021)

- La **clave es el texto en inglés**, en una línea, con la capitalización final que se muestra (`"Book your class"`). `en` no tiene archivo: con `fallbackFormat: true` se muestra la propia clave.
- `es.json` es **plano**, ordenado alfabéticamente por clave; un solo archivo para todo `web/`.
- Interpolación **nombrada**: `"Boutique personal training & small-group fitness in {city}."`. Plurales con `|`: `"{count} class | {count} classes"`.
- Un mismo texto en inglés con sentidos distintos se desambigua con un sufijo literal vacío (`"Full{''}"`), documentado en `docs/i18n-web.md`.
- Valores dinámicos de dominio (`status`, día de la semana, unidad de cobro) se traducen con mapas valor → clave que usan `tl('…')` (marcador identidad para el extractor) y llaman a `t()` al renderizar; nunca claves construidas por concatenación.

### Cómo se usa en cada capa

| Capa | Uso |
|------|-----|
| Componentes Vue (islas) | `const { t } = useLang()`; `t('…')` reactivo al idioma |
| `lib/*.ts` | `t` importado de `@/i18n`; las funciones que producen texto devuelven **descriptores** (`{ key, params }`) o reciben `t`, para que el texto se resuelva al renderizar y reaccione al cambio de idioma (ver «Datos del catálogo») |
| Astro, texto | `<T k="Book your class" />`; con parámetros `<T k="… {city}" params={{ city }} />`. Renderiza `<span data-i18n="…" data-i18n-params='{"city":"…"}'>texto en inglés</span>` |
| Astro, atributos | `{...i18nAttrs({ alt: 'Athlete training with a kettlebell' })}` genera `alt` en inglés + `data-i18n-alt` con la clave; el script cliente actualiza el atributo |
| `<title>` | `<title data-i18n="…" data-i18n-params="…">` y el script cliente actualiza `document.title`. Las metaetiquetas (`description`, `og:*`) quedan en inglés: no ejecutan JS los rastreadores |

### Idioma activo

| Origen | Prioridad |
|--------|-----------|
| `localStorage["jq-lang"]` (clave existente, se conserva) | 1 |
| `navigator.language` (`es*` → `es`) | 2 |
| `en` | 3 |

Valores soportados: `en`, `es` (`supportedLocales`); cualquier otro se normaliza a `en`. El segundo origen es nuevo respecto al comportamiento actual de `web/` y lo alinea con el admin.

### Datos del catálogo (negocio vs. interfaz)

- **No se traduce** lo que escribe el negocio y llega del API: `plan.name`, `plan.note`, `service.name`, `coach_name`, `business.name`, `business.city`. Se muestran tal cual.
- **Sí se traduce** lo que `web/` compone: unidades (`per 4 weeks`, `per class`, `first visit`), conteos (`8 classes`, `2 sessions per week`), textos de respaldo de `data.ts` y la nota generada de compromiso. `Plan.unit/sessions/freq/note` pasan de `string` a `Text = string | { key: string; params?: Record<string, string | number> }`; `PricingGrid` resuelve los descriptores con `t()` al renderizar. Un `string` plano se muestra sin traducir.
- Los nombres de servicio del **respaldo estático** y los filtros del horario (`All`, `Group Strength`, `Tropical Jump`) son claves del catálogo; el valor de filtro sigue siendo el slug/identificador, nunca el texto traducido.

---

## Arquitectura de Cambios

### Fase 1: Fundamentos (Tareas 001-004)

**001 - Verificación de vue-i18n en Astro y decisiones**
- Spike descartable: instalar `vue-i18n`, probar singleton en islas `client:load`/`client:only`, `t` en frontmatter, compilación de mensajes y peso, caracteres especiales y plurales. Registra decisiones en la tarea y en este spec.

**002 - Módulo `src/i18n/` e instalación**
- `bun add vue-i18n`; crear `web/src/i18n/index.ts` (`createI18n`, `t`, `tl`, `setLocale`, `initializeLocale`, `resolveLocale`, `supportedLocales`) y `locales/es.json` con las 35 claves existentes re-escritas con texto inglés como clave. Conserva `jq-lang` y `jq-lang-change`. Seguro en SSR (sin `localStorage`/`navigator`/`document` fuera de funciones).

**003 - Script `i18n:check`**
- `web/scripts/i18n-check.ts`: extrae claves de `t('…')`, `tl('…')`, `<T k="…">`, `i18nAttrs({…})`, `data-i18n` y `title` en `.astro`, `.vue`, `.ts` (excluye `*.test.ts`); falla por claves usadas sin traducción, huérfanas, duplicadas, no ordenadas, variables `{x}` inconsistentes y argumentos no literales. Scripts `i18n:check` e `i18n:sort` en `package.json`; pruebas con fixtures.

**004 - Puente Astro ↔ cliente y `useLang` sobre vue-i18n**
- Reescribir `components/T.astro` (con `params`), crear `lib`/`i18n/attrs` (`i18nAttrs`), reescribir `scripts/i18n-client.ts` (texto, parámetros, atributos, `<title>`, `<html lang>`, carga perezosa de `es`, evento `jq-lang-change`) y `lib/use-lang.ts` (misma API pública: `lang`, `setLang`, `t`) sobre el módulo nuevo.
- Re-clavear de forma **mecánica** (sin texto nuevo) las 35 claves existentes en todos sus consumidores (`Header`, `navigation`, `Footer`, `CtaBand`, `index.astro`, `schedule.astro`, `ScheduleBoard`) y **eliminar** el diccionario de `lib/i18n.ts`; actualizar `lib/i18n.test.ts`.

### Fase 2: Shell y utilidades (Tareas 005-007)

**005 - Shell: layout, navegación, cabecera, pie y componentes comunes**
- `BaseLayout.astro` (`<title>` traducible, `<html lang>` inicial), `lib/navigation.ts`, `Header.vue` (`aria-label` de menú y logo, selector EN/ES accesible), `Footer.astro`, `CtaBand`, `PageHero` (`alt`), `PolicyCard` (`Policies`), `Section`.

**006 - Formato por idioma y datos del catálogo**
- `data.ts`/`catalog.ts`: `Plan` con `Text`, descriptores en `toPlans` y respaldo (plurales `{count} class | {count} classes`); `formatPrice` (`Free` en lugar de `FREE`, locale activo, moneda del `business`); `formatLocalTime` y `formatRange` según idioma (12 h en `en`, 24 h en `es`, igual que el admin); días de la semana por clave. Helpers puros con locale explícito, testeables.

**007 - Componentes Vue: PricingGrid, ScheduleBoard y LeadForm**
- `PricingGrid.vue` (`Most popular`, `Updating…`, `cta` por defecto, resolución de `Text`), `ScheduleBoard.vue` (filtros, `aria-label` de semana y filtro, estados, `spots`, botones, usa los formateadores de 006), `LeadForm.vue` (placeholders, opciones, `submitLabel`, `successMessage` llegan ya como claves traducidas por el padre vía `t()`/props reactivos).

### Fase 3: Migración de páginas (Tareas 008-010)

**008 - Inicio y Nosotros**
- `index.astro` (hero, programas, ticker de palabras, estadísticas, tarjeta de coaching, `alt`), `about.astro` (valores, hero) y sus `title`.

**009 - Páginas de programas**
- `personal-training.astro`, `group-strength-training.astro` (días y horarios por idioma, políticas), `tropical-jump.astro`, `online-coaching.astro`: hero, políticas, incluidos, beneficios, CTAs y `title`.

**010 - Precios, horario, contacto y 404**
- `pricing.astro`, `schedule.astro`, `contact.astro` (campos y opciones del formulario traducibles), `404.astro`.

### Fase final: Verificación y cierre (Tareas 011-013)

**011 - Completitud del catálogo y limpieza**
- Barrido de literales en inglés fuera de `t()`/`<T>`/`i18nAttrs`/`tl`, claves huérfanas, orden de `es.json`, consistencia de variables; lista explícita de excepciones (nombres de marca, `EN`/`ES`).

**012 - Pruebas de i18n en ambos idiomas**
- Pruebas existentes siguen en `en`; nuevas pruebas en `es` para módulo, puente cliente, componentes, formatos y descriptores del catálogo; `tests/dist` verifica que el build contiene `data-i18n` y que `es.json` sale como chunk independiente.

**013 - Documentación y verificación**
- `docs/i18n-web.md`, sección en `web/README.md`, paso `bun run i18n:check` en `scripts/verify-web.sh` y cierre de criterios de aceptación.

---

## Impacto por Módulo

| Ruta | Cambio |
|------|--------|
| `web/package.json`, `bun.lock` | `vue-i18n`; scripts `i18n:check` e `i18n:sort` |
| `web/src/i18n/` | Nuevo: `index.ts`, `attrs.ts`, `locales/es.json` |
| `web/scripts/i18n-check.ts` (+ test) | Nuevo script de calidad |
| `web/src/lib/` | `i18n.ts` pasa a un reexport mínimo o se elimina; `use-lang.ts`, `data.ts`, `catalog.ts`, `schedule.ts`, `navigation.ts` migrados |
| `web/src/components/` | `T.astro` reescrito; el resto migrado |
| `web/src/layouts/BaseLayout.astro` | `<title>` traducible y `lang` |
| `web/src/pages/*.astro` | Texto, `alt` y `title` migrados |
| `web/src/scripts/i18n-client.ts` | Reescrito sobre el módulo nuevo |
| `web/tests/dist/` | Aserciones del build bilingüe |
| `docs/i18n-web.md`, `web/README.md`, `scripts/verify-web.sh` | Documentación y verificación |
| `app/`, `api/` | **Sin cambios** |

---

## Flujos Críticos

### Flujo 1: Primer acceso en un navegador en español
```
1. El visitante abre /pricing sin `jq-lang`; `navigator.language` = "es-MX".
2. El HTML estático llega en inglés; el script cliente resuelve `es`, carga el chunk `es.json`.
3. Reemplaza texto y atributos `data-i18n*`, el `<title>` y `<html lang="es">`; las islas cambian vía `jq-lang-change`.
4. Resultado: página en español; `jq-lang` aún no se guarda hasta que el visitante usa el selector.
```

### Flujo 2: Cambio de idioma en caliente
```
1. El visitante pulsa "ES" en el Header (isla Vue).
2. `setLang('es')` guarda `jq-lang`, actualiza vue-i18n y emite `jq-lang-change`.
3. El script cliente traduce el texto estático de Astro; PricingGrid y ScheduleBoard re-renderizan con `t()`.
4. Resultado: todo el sitio en español sin recargar; precios y horas con formato `es`, moneda y zona del negocio intactas.
```

### Flujo 3: Catálogo desde el API
```
1. PricingGrid recibe planes del API: `name` y `note` del negocio, `unit`/`sessions`/`freq` como descriptores.
2. Con `es`, los descriptores se resuelven (`per 4 weeks` → `cada 4 semanas`; plural «8 clases»); `name` y `note` se muestran tal cual.
3. Resultado: sin mezclar contenido del negocio con el catálogo de interfaz.
```

### Flujo 4: Falla del API y respaldo estático
```
1. getCatalog() usa el respaldo de `data.ts`.
2. Los textos de respaldo son claves del catálogo y se traducen igual que los generados.
3. Resultado: el sitio sigue bilingüe sin API.
```

---

## Notas de Implementación

### Decisiones
- **Clave = texto en inglés** (igual que 021): una sola convención en todo el repositorio; costo asumido: cambiar la redacción renombra la clave en `es.json` (lo detecta `i18n:check`).
- **Idioma en el cliente, sitio estático**: se conserva el modelo actual (HTML en inglés + traducción en el navegador). Alternativa descartada por tamaño: rutas `/es/…` generadas en el build (mejor SEO, pero duplica páginas y cambia URLs, canonical y `routes.test.ts`). Costo asumido: parpadeo de inglés al cargar en español y metaetiquetas solo en inglés.
- **Singleton de i18n + `t` exportado**: la prueba 001 confirmó la reactividad entre islas y el uso desde Astro. Instalar el plugin por isla con `appEntrypoint` no aporta funcionalidad a este flujo.
- **Compilador JIT completo**: +19,8 kB gzip en el spike de 001. Compilar solo el catálogo español y quitar el compilador rompe plurales e interpolación de claves en inglés. El compilador funciona sin `unsafe-eval`.
- **Hidratación**: las islas `client:load` renderizan en `en` y usan el idioma compartido a partir de `onMounted` para evitar desajustes de hidratación; `client:only` (ScheduleBoard) no tiene SSR.
- **Se conservan `jq-lang` y `jq-lang-change`** para no perder la preferencia de visitantes existentes.
- **Descriptores de texto en `lib/`** en lugar de devolver strings ya traducidos: `getCatalog()` se comparte entre islas y se resuelve una vez; el texto debe reaccionar al idioma sin volver a pedir el catálogo.
- **Horas**: `en` 12 h (`9:00 AM`), `es` 24 h (`09:00`), igual que `datetimeFormats` del admin; la hora canónica `HH:mm` se conserva hasta el renderizado. Cambiable en 006 si se prefiere 12 h en ambos.
- **Pruebas existentes corren en `en`** (idioma por defecto): no cambian sus aserciones; las nuevas verifican `es`.
- **Un solo catálogo plano** para el sitio (~10 páginas): `i18n:check` lo mantiene ordenado.

### Trampas conocidas (verificadas en 001)
- Caracteres especiales en el texto-clave: `{`, `}`, `@` y `|` se escapan con literales (`{'@'}`); `$` va directo. El `&` y los apóstrofes tipográficos (`couldn’t`) deben coincidir exactamente entre `.astro` y `es.json`.
- `missingWarn`/`fallbackWarn` en `false` ocultan claves faltantes: por eso existe `i18n:check`.
- En el build, `t` de Astro corre en Node con `locale = en`; no debe depender de `window`.
- `<T>` envuelve el texto en `<span>`: no usarlo dentro de `<title>` ni de atributos; allí se usa `data-i18n` directo e `i18nAttrs`.

### Convención del repositorio
- Código, rutas y nombres técnicos en inglés; documentación y specs en español. Una tarea = una responsabilidad = un commit.
- Funciones de `lib/` puras: reciben locale explícito o devuelven descriptores; no leen estado global salvo `t` importado.

### Seguridad
- Texto traducido se renderiza escapado (interpolación de Vue, `textContent`/`setAttribute` en el script cliente). Prohibido `v-html`/`set:html`/`innerHTML` con mensajes de `t()`.
- `data-i18n-params` se serializa con `JSON.stringify` en el servidor y se lee con `JSON.parse` protegido; solo se aceptan claves presentes en el catálogo `en`/`es`.
- `localStorage` bloqueado no rompe el sitio (se conserva el `try/catch` actual).

### Referencias
- https://vue-i18n.intlify.dev/guide/essentials/syntax.html
- https://vue-i18n.intlify.dev/guide/essentials/pluralization.html
- https://vue-i18n.intlify.dev/guide/advanced/optimization.html
- https://docs.astro.build/en/guides/integrations-guide/vue/
- `features/021-internacionalizacion-app/spec.md` y `app/src/i18n/index.ts`.

### Fuera de alcance
- `app/` y `api/` (feature 021) y las plantillas de correo (feature 018).
- Rutas por idioma (`/es/…`), `hreflang`, traducción de `meta description`/`og:*` y SEO multilingüe.
- Idiomas adicionales a `en` y `es`; RTL; idioma por usuario guardado en servidor.
- Traducir contenido del negocio (nombres, notas, ciudad, entrenadores) o imágenes con texto.
- Enviar el formulario de contacto al API (hoy solo muestra el mensaje de éxito).

---

## Criterios de Aceptación

- [ ] Con `en` todo el sitio se ve en inglés idéntico al actual; con `es`, todo el texto visible está en español (salvo contenido del negocio).
- [ ] El idioma inicial respeta `jq-lang` → `navigator.language` → `en`; el selector cambia el idioma sin recargar, persiste y sincroniza todas las islas.
- [ ] `<html lang>`, `<title>`, `alt`, `aria-label` y `placeholder` siguen el idioma activo.
- [ ] Precios, horas, días y rangos de fecha usan el idioma activo; moneda y zona horaria siguen siendo las del `business`.
- [ ] Planes y horarios del API y del respaldo estático se muestran bilingües sin traducir nombres ni notas del negocio.
- [ ] `bun run i18n:check` termina en verde (sin claves faltantes, huérfanas ni variables inconsistentes) y no quedan literales en inglés fuera de las excepciones documentadas.
- [ ] No se cambia ninguna URL ni el contenido en inglés del build (`tests/dist/routes.test.ts` sigue en verde).
- [ ] `docs/i18n-web.md` existe y `scripts/verify-web.sh` incluye `i18n:check` y termina en verde.
- [ ] `bun run lint`, `format:check`, `check`, `test` y `build` en `web/` terminan en verde.

---

## Dependencias Entre Tareas

```
001 (verificación)                 → 002
002 (módulo i18n)                  → 003, 004
003 (i18n:check)                   → 005-011
004 (puente + useLang)             → 005
005 (shell)                        → 006, 008-010
006 (formato y catálogo)           → 007, 009, 010
007 (componentes Vue)              → 009, 010
008-010 (páginas)                  → 011
011 (completitud)                  → 012
001-012                            → 013 (documentación y verificación)
```

---

## Validación Post-Deploy

1. `cd web && bun run lint && bun run format:check && bun run check && bun run test && bun run build && bun run i18n:check` en verde; `bash scripts/verify-web.sh` en verde.
2. Abrir el sitio con el navegador en español y en inglés: el idioma inicial es el esperado; el selector del Header lo cambia sin recargar en inicio, precios, horario y contacto.
3. Recorrer `/pricing`, `/schedule` y `/group-strength-training` en ambos idiomas: precios con moneda del negocio, horas y días correctos, nombres y notas del negocio sin alterar.
4. Con el API apagado (`PUBLIC_API_URL` vacío): el respaldo estático sigue bilingüe.
5. Recargar tras elegir `es`: la preferencia persiste y `<html lang="es">`.

---

## Prompt y modelo utilizado

### Modelo

Sonnet 5.5

### Prompt

```
Necesitamos implementar apropiadamente i18N en /app. Usemos vue-i18n, y sigamos un enfoque simple para los key/values. por ejemplo:

es.json: { "Settings": "Configuración", "Sign out": "Cerrar sesión", "Created At": "Creado El", "Name": "Nombre", ... }
index.ts: createI18n (legacy: false, locale "en", fallbackLocale "en", fallbackFormat: true), carga perezosa de es.json, setLocale/initializeLocale con localStorage y navigator.language.

Idioma ppal es "en"

Solo implementar en /web.

El plan que generaras déjalo plasmado en español en features/NNN-…/spec.md, crea las carpetas de ser necesario respetando el consecutivo, puedes usar features/spec-template.md como plantilla. Luego con base en ese spec crea las tareas granulares en features/NNN-…/tasks/NNN-….md, creando un consecutivo ordenado, tasks debidamente priorizadas teniendo en cuenta dependencias resueltas con anterioridad, puedes usar features/task-template.md como plantilla.

No hay que hacer implementacion en este momento.
```
