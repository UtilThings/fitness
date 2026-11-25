# Especificación: Internacionalización (i18n) del admin `app/`

- **Estado:** Pendiente

## Resumen Ejecutivo

Este conjunto de 26 tareas implementa i18n en el admin (`app/`, Vue 3 + PrimeVue) con `vue-i18n`. El **idioma principal es inglés (`en`)**: el texto en inglés vive en el código y funciona como *key*; el español (`es`) es un catálogo plano `es.json` que se carga bajo demanda. Hoy todo el texto de la interfaz está escrito en español dentro de 83 componentes/vistas y de `lib/`, `composables/` y `router/`; esta feature lo reescribe en inglés, lo envuelve en `t()` y mueve el español a `es.json` sin cambiar el comportamiento observable cuando el idioma es `es`. Además, los mensajes de error de `api/` (hoy en español) pasan a inglés y el app los traduce. **No** traduce `web/`, ni las plantillas de correo a clientes (ya tienen su propio `locale` por cliente), ni los datos que escribe el usuario (nombres de servicios, planes, notas).

Entrega:

1. **Módulo `app/src/i18n/`**: instancia `vue-i18n` (Composition API, `legacy: false`), `locales/es.json`, detección del idioma inicial (`localStorage` → `navigator.language` → `en`), carga perezosa de `es`, y un `t` utilizable fuera de componentes.
2. **Selector de idioma** persistente, con sincronización de `<html lang>`, el título del documento y el `locale` de PrimeVue (calendarios, diálogos de confirmación, filtros).
3. **Formato por idioma**: fechas, horas, números y comparación/ordenamiento dependen del idioma activo; la moneda y la zona horaria siguen viniendo del `business`.
4. **Migración de todo el texto visible** (shell, labels de dominio, vistas y componentes por módulo) a claves en inglés con su traducción al español.
5. **Mensajes del API en inglés** (estáticos y estables) que el app traduce con el mismo catálogo.
6. **Herramientas de calidad**: script `i18n:check` (claves faltantes/huérfanas) integrado en `verify-app.sh`, pruebas en ambos idiomas y documentación.

Contrato que deja a las siguientes features: todo texto visible nuevo se escribe en inglés dentro de `t('…')` (o `<i18n-t>`), se agrega su traducción a `es.json` y `bun run i18n:check` debe terminar en verde.

---

## Estado actual del repositorio (punto de partida)

| Elemento | Estado |
|----------|--------|
| `app/package.json` | Sin `vue-i18n`. Stack: Vue 3.5, PrimeVue 5, vue-router 5, vitest 5 + happy-dom, bun |
| `app/src/i18n/` | No existe (esta feature lo crea). Existe un borrador de referencia: `index.ts` y `locales/es.json` con claves planas en inglés → español (`"Sign out": "Cerrar sesión"`) |
| Texto de UI | 100 % en español, incrustado en 83 `.vue`, `lib/*.ts`, `composables/*.ts`, `layouts/admin-nav.ts`, `router/index.ts` (`meta.title`), `components/**/*-labels.ts` y `report-presentation.ts` |
| Formato | `lib/datetime.ts` fija `es-US` (y `en-US` solo para horas); `lib/money.ts` fija `en-US`; reportes usan `es-US`; orden con `localeCompare(…, 'es')` en `CoachingView` y `ProgramFormDialog` |
| Idioma de clientes | `clients.locale` (`es`/`en`) define el idioma de los correos; es un dato de dominio, **no** el idioma de la interfaz (`CommunicationsView`, `ClientForm`, `lib/messages.ts`) |
| Errores del API | ~110 `ForbiddenError`/`BadRequestError`/`NotFoundError`/`fieldError` en español en `api/src/hooks` y `api/src/lib`; `app/src/lib/pb-errors.ts` muestra `response.message` tal cual |
| Pruebas | ~60 archivos `*.test.ts` que afirman texto en español |
| Scripts | `scripts/verify-app.sh` ejecuta lint, typecheck, tests y build del app |

> Verificación obligatoria previa (tarea 001): comprobar con la versión instalada de `vue-i18n` el comportamiento de claves con `.`, `|`, `@`, `{`, `}` y `$` como texto-clave, `fallbackFormat` y la carga perezosa de `es.json`; el diseño de claves depende de ello.

---

## Contrato de claves y uso

### Convención (decisión central)

- La **clave es el texto en inglés**, en una sola línea, con la capitalización final que se muestra (`"Sign out"`, `"Created At"`). `en` no tiene archivo: con `fallbackFormat: true` se muestra la propia clave.
- `es.json` es **plano** (sin anidar) y ordenado alfabéticamente por clave; un solo archivo para todo el app.
- Interpolación **nombrada**: `"{count} clients selected"`. Plurales con `|` y `{n}`/`{count}`: `"No clients | 1 client | {count} clients"`.
- Texto con marcado o enlaces usa `<i18n-t keypath="…" tag="p">` con slots, nunca concatenación de fragmentos traducidos.
- Un mismo texto en inglés con **sentidos distintos** se desambigua con contexto entre llaves en la clave (`"Open"` vs `"Open (status)"`), decidido caso por caso y documentado en `docs/i18n.md`.
- Texto dinámico de dominio (valores de enums como `role`, `status`) se traduce con mapas `Record<valor, clave>` que llaman a `t()` al renderizar, nunca con claves construidas por concatenación (`t('role.' + x)`), para que el extractor las encuentre.
- Fuera de componentes (`lib/`, `composables/`, `router`) se usa `t` exportado de `@/i18n`; las listas de labels pasan de constantes a funciones/`computed` para reaccionar al cambio de idioma.

### Idioma activo

| Origen | Prioridad |
|--------|-----------|
| `localStorage["locale"]` | 1 |
| `navigator.language` (`es*` → `es`) | 2 |
| `en` | 3 |

Valores soportados: `en`, `es` (`supportedLocales`). Cualquier otro valor se normaliza a `en`.

### Mensajes del API

El API responde mensajes en inglés, **estáticos** y estables. Los que hoy interpolan valores se reescriben sin valores dinámicos o devuelven los valores en `data` (nunca dentro del texto). El app traduce `response.message` con `te(message) ? t(message) : message`, de modo que un mensaje no catalogado (p. ej. de PocketBase) se ve tal cual y nunca rompe.

---

## Arquitectura de Cambios

### Fase 1: Fundamentos (Tareas 001-005)

**001 - Verificación de vue-i18n y decisiones de claves**
- Instancia temporal para comprobar claves con caracteres especiales, `fallbackFormat`, plurales, `i18n-t`, carga perezosa y tamaño del bundle. Ajusta este spec si algo falla.

**002 - Módulo `i18n` e instalación de vue-i18n**
- `bun add vue-i18n`; `app/src/i18n/index.ts` (basado en el borrador: `createI18n`, `setLocale`, `initializeLocale`, `t`/`te` exportados), `locales/es.json` inicial, `app.use(i18n)` y `await initializeLocale()` antes de montar en `main.ts`.
- Se elimina de `numberFormats` la moneda fija por idioma (la moneda es del `business`).

**003 - Infraestructura de pruebas**
- `vitest.config.ts` con `setupFiles`; helper `mountWithI18n`/plugin compartido; las pruebas existentes corren en `es` por defecto para conservar sus aserciones y las nuevas de i18n cubren `en`.

**004 - Selector de idioma y sincronización**
- Componente `LocaleSwitcher` en `AdminLayout`/`AuthLayout`; `setLocale` actualiza `<html lang>`, `document.title` (desde `route.meta.title`) y `primevue/config` (`locale` con `aria`, `dayNames`, `monthNames`, `accept/reject`, etc.).

**005 - Script `i18n:check`**
- `app/scripts/i18n-check.ts` (bun): extrae las claves usadas (`t('…')`, `$t`, `te`, `keypath="…"`, `tl('…')` marcador) y las compara con `es.json`; falla por claves faltantes, huérfanas, duplicadas o con variables `{x}` distintas a las de la clave. Script `"i18n:check"` en `package.json`.

### Fase 2: Utilidades transversales (Tareas 006-007)

**006 - Formato de fechas, números, moneda y ordenamiento por idioma**
- `lib/datetime.ts`, `lib/money.ts`, `components/reports/*` y `localeCompare` usan el idioma activo (`es` → `es-US`, `en` → `en-US`); zona horaria y moneda siguen del `business`. `parseToCents` mantiene su tolerancia a `1.234,56`.

**007 - Errores, notificaciones y diálogos genéricos**
- `lib/pb-errors.ts`, `useNotify`, `useConfirmDelete`, `useCollection`, `useCatalogActions`, `useClients`, `useAuditLogs`, `usePayments`, `useMemberships`: mensajes en inglés con `t()`; `parsePbError` traduce `response.message` si está catalogado.

### Fase 3: Migración del texto de la interfaz (Tareas 008-018)

**008 - Shell, navegación, autenticación y errores de ruta**
- `layouts/*`, `admin-nav.ts` (labels como funciones), `router/index.ts` (`meta.title` como clave), `lib/permissions.ts`, `PageHeader`, `EmptyState`, `DataToolbar`, `StatusTag`, `AuthHeading`, `LoginView`, `ForgotPasswordView`, `NotFoundView`, `ForbiddenView`.

**009 - Labels de dominio compartidos**
- `lib/catalog.ts`, `lib/agenda.ts`, `lib/bookings.ts`, `lib/memberships.ts`, `lib/coaching.ts`, `lib/audit.ts`, `lib/messages.ts`, `lib/schedule-week.ts`, `lib/integration-origins.ts`, `components/team/team-labels.ts`, `team-validation.ts`, `types/pb.ts`: mapas `valor → clave` y validaciones con `t()`.

**010 - Equipo y perfil** · **011 - Catálogo (servicios y planes)** · **012 - Horarios y clases** · **013 - Clientes** · **014 - Reservas, asistencia y membresías** · **015 - Pagos y recibos** · **016 - Coaching y agenda de coaches** · **017 - Dashboard y reportes** · **018 - Comunicaciones, auditoría y ajustes del negocio**
- Cada tarea migra vistas y componentes de su módulo (listado en la tarea), agrega sus claves a `es.json`, actualiza sus pruebas y deja `i18n:check` en verde. El texto del `business`/del usuario (nombres, notas) no se traduce.

### Fase 4: Mensajes del API (Tareas 019-023)

**019 - Inventario y convención de mensajes del API**
- Catálogo de los ~110 mensajes y de los que interpolan; decisión por mensaje (estático / con `data`). Documento de trabajo en `docs/i18n.md`.

**020 - Mensajes en inglés: identidad, negocio y catálogo** (`admins`, `businesses`, `business-key`, `tenant`, `catalog`, `catalog-order`, `audit`, `public`, `lib/business*.ts`, `lib/catalog.ts`, `lib/team-guards.ts`)
**021 - Mensajes en inglés: agenda y reservas** (`schedule*`, `scheduling`, `bookings*`, `booking-availability`, `membership-bookings`, `lib/schedule-*`, `lib/booking-*`, `lib/session-rules.ts`, `lib/private-sessions.ts`)
**022 - Mensajes en inglés: clientes, membresías, pagos, coaching, mensajes y reportes** (`clients`, `memberships*`, `payments*`, `coaching`, `messages*`, `dashboard`, `reports`, `lib/*` asociados)
- Las tres: solo cambian textos y, donde se decida, `data`; pruebas del API y `scripts/verify-*.ts` actualizados; las descripciones de auditoría nuevas se escriben en inglés y estáticas.

**023 - Traducción de mensajes del API en el app**
- Catálogo `es.json` con todos los mensajes de 020-022, `parsePbError` y `fieldMessages` traducen, y las vistas muestran errores de campo traducidos; las descripciones de auditoría estáticas se traducen al mostrarse (`lib/audit.ts`).

### Fase final: Verificación y cierre (Tareas 024-026)

**024 - Completitud del catálogo y limpieza**
- Barrido de texto en español residual en `app/src` (excluyendo `es.json`, datos y pruebas de idioma), `i18n:check` sin claves faltantes/huérfanas, orden de `es.json`.

**025 - Pruebas de i18n en ambos idiomas**
- Pruebas de cambio de idioma en caliente, persistencia, detección inicial, `<html lang>`, título, formato de fecha/moneda y un recorrido de vistas representativas en `en` y `es`.

**026 - Documentación y script de verificación**
- `docs/i18n.md` (convenciones, cómo agregar un idioma/texto, trampas), `scripts/verify-app.sh` ejecuta `i18n:check`; README de `app/`.

---

## Impacto por Módulo

| Ruta | Cambio |
|------|--------|
| `app/package.json` | `vue-i18n`; script `i18n:check` |
| `app/src/i18n/` | `index.ts`, `locales/es.json` (nuevo) |
| `app/src/main.ts`, `App.vue` | Registro del plugin, inicialización de idioma, título |
| `app/src/layouts/`, `router/` | Selector de idioma, labels y títulos traducibles |
| `app/src/lib/`, `composables/` | Formato por idioma, labels y mensajes con `t()` |
| `app/src/views/`, `components/` | Todo el texto visible en `t()`; pruebas actualizadas |
| `app/scripts/i18n-check.ts` | Verificador de catálogo (nuevo) |
| `app/vitest.config.ts`, `src/test/` | `setupFiles` y helpers de i18n |
| `api/src/hooks/`, `api/src/lib/` | Mensajes de error y descripciones de auditoría en inglés |
| `api/pb_hooks/` | Regenerado por el build (no se edita a mano) |
| `scripts/verify-*.ts`, `scripts/verify-app.sh` | Aserciones de mensajes; `i18n:check` |
| `docs/i18n.md` | Nuevo |

---

## Flujos Críticos

### Flujo 1: Primer acceso en un navegador en español
```
1. El usuario abre el admin con navigator.language = "es-MX" y sin localStorage
2. initializeLocale resuelve "es", carga es.json y fija <html lang="es">
3. Resultado: toda la interfaz, fechas y números en español; localStorage["locale"] = "es"
```

### Flujo 2: Cambio de idioma en caliente
```
1. El usuario elige "English" en el selector
2. setLocale("en") cambia el idioma, actualiza <html lang>, título y locale de PrimeVue
3. Resultado: textos, fechas y diálogos cambian sin recargar; la preferencia persiste
```

### Flujo 3: Error del API
```
1. El API rechaza una acción con 403 "Your role does not allow this operation."
2. parsePbError busca el mensaje en el catálogo → en "es" muestra "Tu rol no permite esta operación."
3. Resultado: un mensaje no catalogado (p. ej. de PocketBase) se muestra tal cual, sin romper
```

---

## Notas de Implementación

### Decisiones
- **Clave = texto en inglés** (decidido): menos fricción que claves jerárquicas y el inglés no necesita archivo. Costo asumido: cambiar la redacción en inglés implica renombrar la clave en `es.json` (lo detecta `i18n:check`).
- **Pruebas existentes corren en `es`** vía `setupFiles`: conserva sus aserciones y evita reescribir ~60 archivos; las claves de `es.json` salen del texto original, así que coinciden por construcción. Las pruebas nuevas verifican `en`.
- **Un solo catálogo plano** en lugar de uno por módulo: el app es pequeño (~83 componentes) y `i18n:check` lo mantiene ordenado.
- **El idioma de la interfaz es de cada usuario** (navegador/`localStorage`), no del `business` ni de `clients.locale`.
- **Mensajes del API como clave**: evita negociar `Accept-Language` en goja (sin `Intl`, ver feature 020/tarea 001) y mantiene un único catálogo; alternativa descartada: diccionario bilingüe en el API.
- **Auditoría histórica** (`audit_logs.description` ya guardada en español) no se migra; se muestra tal cual. Lo nuevo se guarda en inglés.

### Trampas conocidas de vue-i18n (confirmar en 001)
- Caracteres especiales de la sintaxis de mensajes en el texto-clave: `{`, `}`, `@`, `$`, `|` (se escapan con literales `{'@'}`).
- Claves con `.` resuelven primero como ruta; con catálogo plano y `fallbackFormat` debe encontrarse la clave literal.
- `missingWarn`/`fallbackWarn` en `false` ocultan claves faltantes: por eso existe `i18n:check`.

### Convención del repositorio
- Código, rutas y nombres técnicos en inglés; documentación y specs en español. Las funciones de `lib/` siguen siendo puras: reciben `t` solo si no pueden importarlo sin acoplarse al estado global.
- Una tarea = una responsabilidad = un commit.

### Seguridad
- Texto traducido se renderiza con interpolación de Vue (escapado); `v-html` queda prohibido para mensajes de `t()`. Los mensajes del API traducidos no incluyen datos de otros negocios.

### Referencias
- https://vue-i18n.intlify.dev/guide/essentials/syntax.html
- https://vue-i18n.intlify.dev/guide/essentials/pluralization.html
- https://vue-i18n.intlify.dev/guide/advanced/component.html
- https://primevue.org/configuration/#locale

### Fuera de alcance
- Traducir `web/` (feature futura) y las plantillas/correos a clientes (feature 018).
- Idiomas adicionales a `en` y `es`; idioma por usuario guardado en el servidor; RTL.
- Traducir datos de usuario (nombres, notas, descripciones de servicios) o la auditoría histórica.
- Reemplazar la moneda/zona del `business` por la del idioma.

---

## Criterios de Aceptación

- [ ] Con `locale = en` toda la interfaz se muestra en inglés; con `es`, en español idéntico al actual.
- [ ] El idioma inicial respeta `localStorage` → `navigator.language` → `en`, y el selector cambia el idioma sin recargar y persiste.
- [ ] `<html lang>`, título del documento y componentes PrimeVue (calendario, confirmaciones) siguen el idioma activo.
- [ ] Fechas, horas, números y ordenamientos usan el idioma activo; moneda y zona horaria siguen siendo las del `business`.
- [ ] No queda texto visible en español fuera de `es.json` (salvo datos de usuario y auditoría histórica).
- [ ] Los errores del API se muestran traducidos en `es`; un mensaje no catalogado se muestra sin fallar.
- [ ] `bun run i18n:check` termina en verde (sin claves faltantes, huérfanas ni variables inconsistentes).
- [ ] `docs/i18n.md` existe y `scripts/verify-app.sh` incluye `i18n:check` y termina en verde.
- [ ] `bun run lint`, `typecheck`, `test` y `build` en `app/`, y los tests del API, terminan en verde.

---

## Dependencias Entre Tareas

```
001 (verificación)                → 002
002 (módulo i18n)                 → 003, 004, 005, 006, 007
003 (pruebas)                     → 004, 006, 007 y todas las migraciones
005 (i18n:check)                  → 008-018, 023, 024
004, 006, 007                     → 008
008 (shell)                       → 009
009 (labels de dominio)           → 010-018
010-018 (vistas por módulo)       → 024
019 (inventario API)              → 020, 021, 022
020, 021, 022                     → 023
002, 007                          → 023
023, 024                          → 025
001-025                           → 026 (documentación y verificación)
```

Las tareas 019-022 (API) no dependen del app y pueden ejecutarse en paralelo a la Fase 3; en orden secuencial se dejan después para que 023 las consuma.

---

## Validación Post-Deploy

1. `cd app && bun run lint && bun run typecheck && bun run test && bun run build && bun run i18n:check` en verde; `cd api && bun test` y `bash scripts/verify-app.sh` en verde.
2. Abrir el admin con el navegador en español y en inglés: el idioma inicial es el esperado; cambiarlo en el selector actualiza todo sin recargar.
3. Provocar un error del API (p. ej. acción sin permiso como `reception`): el mensaje aparece traducido en `es` y en inglés en `en`.
4. Recorrer dashboard, clientes, pagos y reportes en ambos idiomas: fechas, números y moneda del `business` correctos.

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

Por ahora solo implementar en /app y /api si es necesario.

El plan que generaras déjalo plasmado en español en features/NNN-…/spec.md, crea las carpetas de ser necesario respetando el consecutivo, puedes usar features/spec-template.md como plantilla. Luego con base en ese spec crea las tareas granulares en features/NNN-…/tasks/NNN-….md, creando un consecutivo ordenado, tasks debidamente priorizadas teniendo en cuenta dependencias resueltas con anterioridad, puedes usar features/task-template.md como plantilla.

No hay que hacer implementacion en este momento.
```
