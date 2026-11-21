# Especificación: Base de módulos en `app/`

- **Estado:** Completado

## Resumen Ejecutivo

Este conjunto de 9 tareas deja en `app/` la infraestructura común que reutilizarán todos los módulos de administración (007-017): tipos TypeScript de las colecciones, `useAuth` con `role` y `can()`, protección de rutas por rol, un composable genérico `useCollection` para listas y CRUD contra PocketBase, componentes compartidos de página, avisos y confirmaciones globales, utilidades de fecha (`America/New_York`) y dinero (centavos → USD), una navegación limpia y una vista 403. No implementa ningún módulo de negocio: depende de los campos `role` y `active` de la feature 005.

Entrega:

1. **Tipos** (`src/types/pb.ts`): interfaces de `admins` y `audit_logs` y la base para que cada feature añada la suya.
2. **Permisos y rol**: `useAuth` expone `role`, `isOwner` y `can(permiso)`, con la matriz en `src/lib/permissions.ts`; el guard del router respeta `meta.roles`; vista 403.
3. **`useCollection`**: lista paginada con filtros y orden, crear/editar/borrar y traducción de errores de PocketBase a mensajes y errores por campo.
4. **Componentes compartidos**: `PageHeader`, `StatusTag`, `EmptyState`, `DataToolbar` y `useConfirmDelete` sobre `ConfirmDialog`; `Toast` y `ConfirmationService` registrados globalmente.
5. **Utilidades**: `src/lib/datetime.ts` (hora local de `America/New_York` con `Intl`, entrada local → UTC) y `src/lib/money.ts` (centavos → USD y parseo seguro).
6. **Navegación limpia**: `admin-nav.ts` sin badges falsos ni entradas sin módulo, agrupada en Análisis, Operaciones, Catálogo, Ajustes y Facturación, con filtro por rol.

Contrato que deja a las siguientes features: `useCollection<T>`, los componentes compartidos, `can()`/`meta.roles`, `formatDateTime`/`formatUsd` y el patrón de entrada de menú real que sustituye a un marcador.

---

## Estado actual del repositorio (punto de partida)

| Elemento | Estado |
|----------|--------|
| `app/src/composables/useAuth.ts` | Expone `user`, `isAuthenticated`, `avatarUrl`, `login`, `logout`, `requestPasswordReset` contra `admins`; sin `role` ni `can()` |
| `app/src/router/index.ts` | Rutas hijas de `AdminLayout` (`meta.requiresAuth`, `meta.title`) y de `AuthLayout`; guard por `to.matched`; solo existe la ruta `dashboard` |
| `app/src/layouts/admin-nav.ts` | Grupos Análisis, Operaciones, Ajustes, Facturación con entradas marcador (`/reports`, `/clients`, `/classes`, `/routines`, `/team`, `/plans`, `/payments`, `/subscriptions`) y badges falsos (`12`, `70`) |
| `app/src/layouts/AdminLayout.vue` | Renderiza `adminNav` tal cual; menú de usuario con «Ajustes» y «Notificaciones» sin destino |
| `app/src/main.ts` | Registra PrimeVue y router; sin `ToastService` ni `ConfirmationService` |
| `app/src/lib/` | `env.ts`, `pocketbase.ts` (`pb`), `theme.ts`; sin `datetime.ts`, `money.ts` ni `permissions.ts` |
| `app/src/components/` | Solo `AuthHeading.vue` |
| `app/src/views/` | `admin/DashboardView.vue`, `auth/*`, `NotFoundView.vue`; no hay vista 403 |
| Pruebas | Vitest con `useAuth.test.ts`, `useMediaQuery.test.ts`, `admin-nav.test.ts`, `router/index.test.ts`, `env.test.ts` |
| API | Los campos `role` y `active` llegan con la feature 005 (contrato); aquí solo se consumen |

> Verificación obligatoria previa: la tarea 003 debe confirmar en `node_modules/primevue` los nombres vigentes de `Toast`, `ToastService`, `ConfirmDialog`, `ConfirmationService`, `DataTable` y `Tag` en PrimeVue 5 antes de registrarlos.

---

## Arquitectura de Cambios

### Fase 1: Utilidades y tipos (Tareas 001-002)

**001 - Tipos TypeScript de colecciones**
- `app/src/types/pb.ts`: `Role = 'owner' | 'coach' | 'reception'`, `BaseRecord` (`id`, `created`, `updated`, `collectionId`, `collectionName`), `Admin`, `AuditLog`, y `ListResult<T>` (alias de `ListResult` del SDK). Convención: una interfaz por colección con campos snake_case y fechas como `string` ISO UTC.

**002 - `datetime.ts` y `money.ts`**
- `src/lib/datetime.ts` (zona fija `America/New_York` con `Intl.DateTimeFormat`): `formatDate`, `formatTime`, `formatDateTime` (desde ISO UTC, en español), `localToUtcIso(date, time)` (calcula el offset con `Intl`, resuelve horas ambiguas/inexistentes igual que `api/src/lib/tz.ts`), `utcToLocalParts(iso)` → `{ date, time, weekday }`, `todayLocal()`.
- `src/lib/money.ts`: `formatUsd(cents)` (`Intl.NumberFormat('en-US', {currency: 'USD'})`), `centsToDecimal`, `parseUsdToCents(texto)` (acepta `$1,234.50`, rechaza más de 2 decimales y negativos inválidos) sin aritmética de coma flotante.
- Pruebas con fechas de los dos cambios de horario y centavos límite (0, 1, 99, 100, 123456).

### Fase 2: Autenticación y permisos (Tareas 003-005)

**003 - Avisos y confirmaciones globales**
- `main.ts`: `.use(ToastService)` y `.use(ConfirmationService)`; `App.vue` monta `<Toast position="top-right" />` y `<ConfirmDialog />`.
- `src/composables/useNotify.ts`: `success`, `error`, `info` (envoltura de `useToast`) con duraciones y títulos por defecto en español.

**004 - `useAuth` con rol y `can()`**
- `src/lib/permissions.ts`: tipo `Permission` (inicial: `team.read`, `team.manage`, `profile.edit`, `audit.read`) y `PERMISSIONS: Record<Permission, Role[]>`; `roleCan(role, permission)`. Cada feature añade sus permisos aquí.
- `useAuth`: `role` (computed desde `user.role`, `null` si falta), `isOwner`, `isActive` y `can(permission)`. Un `user.active === false` se trata como sin permisos y fuerza `logout()` al refrescar sesión.
- Pruebas de la matriz y de `can` sin sesión.

**005 - Guard por rol y vista 403**
- `RouteMeta.roles?: Role[]` en `router/index.ts`; el guard, tras comprobar sesión, compara `useAuth().role` con `meta.roles` de cualquier ruta coincidente y redirige a la ruta `forbidden`.
- `src/views/ForbiddenView.vue` (ruta `/forbidden`, `meta.title: 'Sin permiso'`, hija de `AdminLayout`) con mensaje, botón «Volver al inicio».
- Actualizar `router/index.test.ts`: sin rol → 403, rol permitido → pasa.

### Fase 3: Composable y componentes (Tareas 006-007)

**006 - `useCollection`**
- `src/lib/pb-errors.ts`: `parsePbError(error)` → `{ message, fields: Record<string, string>, status }` desde `ClientResponseError` (400 con `data`, 403, 404, 409, red caída → `status 0`).
- `src/composables/useCollection.ts`: `useCollection<T>(name, options)` con `items`, `total`, `page`, `perPage`, `sort`, `filters` (reactivo), `loading`, `error`, `load()`, `setPage`, `setSort`, `search`, `create(data)`, `update(id, data)`, `remove(id)`. Los filtros se construyen con `pb.filter(expr, params)` (nunca concatenando); se cancelan peticiones obsoletas con `requestKey`; `create/update` devuelven el registro y `remove` devuelve el resultado booleano del SDK. Las tres operaciones recargan la lista al completarse y lanzan el error traducido si falla la escritura.
- Pruebas con el SDK mockeado: paginación, orden, filtro parametrizado, error 400 con campos, `remove`.

**007 - Componentes compartidos**
- `src/components/PageHeader.vue` (título, descripción, slot `actions`), `StatusTag.vue` (mapa `value → {label, severity}` por prop), `EmptyState.vue` (icono, título, descripción, slot de acción), `DataToolbar.vue` (búsqueda con *debounce*, slot de filtros, slot de acciones; emite `search`) y `src/composables/useConfirmDelete.ts` (`confirmDelete({ message, onConfirm })` sobre `useConfirm` con texto y estilo «peligro» en español).
- Pruebas con `@vue/test-utils` (si no está instalado, añadirlo como dependencia de desarrollo).

### Fase 4: Navegación y cierre (Tareas 008-009)

**008 - Limpieza de `admin-nav.ts`**
- Quitar `badge` de `NavItem`, y las entradas sin módulo (`Rutinas`, `Suscripciones`); el menú de usuario deja de mostrar «Notificaciones». Estructura por grupos: **Análisis** (Dashboard, Reportes), **Operaciones** (Clientes, Clases, Reservas), **Catálogo** (Servicios, Planes), **Ajustes** (Equipo), **Facturación** (Membresías, Pagos).
- `NavItem` gana `roles?: Role[]` y `placeholder?: boolean` (marcadores de módulos futuros); `visibleNav(role)` filtra por rol y omite grupos vacíos; `AdminLayout` usa `visibleNav`.
- Las features siguientes retiran `placeholder` al entregar su ruta real. `admin-nav.test.ts` valida rutas únicas, grupos no vacíos, sin `badge` y que todo item no marcador tenga ruta registrada.

**009 - Pruebas, README y verificación**
- Completar pruebas faltantes y `app/README.md`: secciones «Módulos de administración» (cómo crear una vista de listado con `useCollection`, `PageHeader`, `DataToolbar`), permisos y `meta.roles`, `datetime`/`money`, convención de tipos.
- `scripts/verify-app.sh` en verde; marcar la feature como completada.

---

## Impacto por Módulo

| Ruta | Cambio |
|------|--------|
| `app/src/types/` | `pb.ts` |
| `app/src/lib/` | `datetime.ts`, `money.ts`, `permissions.ts`, `pb-errors.ts` (+ pruebas) |
| `app/src/composables/` | `useAuth.ts` (modificado), `useNotify.ts`, `useCollection.ts`, `useConfirmDelete.ts` |
| `app/src/components/` | `PageHeader.vue`, `StatusTag.vue`, `EmptyState.vue`, `DataToolbar.vue` |
| `app/src/views/` | `ForbiddenView.vue` |
| `app/src/router/index.ts` | `meta.roles`, guard por rol, ruta `forbidden` |
| `app/src/layouts/` | `admin-nav.ts` y `AdminLayout.vue` (nav filtrada, menú sin «Notificaciones») |
| `app/src/main.ts`, `App.vue` | `ToastService`, `ConfirmationService`, `Toast`, `ConfirmDialog` |
| `app/README.md` | Documentación de la base de módulos |
| `api/`, `web/` | Sin cambios |

---

## Flujos Críticos

### Flujo 1: Ruta restringida por rol
```
1. Un coach abre una ruta con meta.roles = ['owner']
2. El guard comprueba sesión y luego role ∉ meta.roles
3. Resultado: redirección a /forbidden con la vista 403; la ruta y su menú no se muestran a ese rol
```

### Flujo 2: Listado con filtros y errores
```
1. Una vista llama useCollection('<colección>', { perPage: 20, sort: '-created' })
2. El usuario escribe en DataToolbar → search() → filter parametrizado con pb.filter → load()
3. Si la API responde 400 al crear, parsePbError devuelve errores por campo que la vista pinta bajo cada input
4. Resultado: la lista se refresca sin concatenar strings en filtros y los errores son legibles
```

### Flujo 3: Borrado con confirmación
```
1. Usuario pulsa «Eliminar» → useConfirmDelete abre ConfirmDialog
2. Al aceptar, remove(id) → éxito: Toast «Eliminado» y recarga; error 409/403: Toast con el mensaje de la API
3. Resultado: ningún borrado sin confirmación explícita
```

---

## Notas de Implementación

### Decisiones
- **Permisos como matriz en un solo archivo** (`permissions.ts`), no `if (role === ...)` dispersos: las features añaden acciones sin tocar la lógica; la API sigue siendo la autoridad (la UI solo oculta).
- **`useCollection` genérico y delgado** (sin caché global ni librería de estado): suficiente para listas administrativas; evita introducir Pinia o TanStack Query.
- **Filtros siempre con `pb.filter`**: evita inyección de filtros por texto libre.
- **`datetime.ts` con `Intl` en la app y `tz.ts` sin `Intl` en el servidor**: los navegadores tienen `Intl` fiable, goja no; ambos deben coincidir en los casos límite y se prueban con las mismas fechas.
- **Marcadores de nav conservados con `placeholder`** para los módulos que sí existirán. Se muestran deshabilitados hasta que la feature registre la ruta y retire el marcador; se eliminan los que no tendrán módulo (Rutinas, Suscripciones, Notificaciones).
- **403 por redirección** y no por componente inline: una sola vista y un solo punto de decisión (guard).

### Convención de código
- Tipos de colecciones en `src/types/pb.ts` (una interfaz por colección); fechas ISO UTC como `string`.
- Composables `useX` en `src/composables/`, lógica pura en `src/lib/` con prueba junto al archivo.
- Textos de UI en español; identificadores en inglés.

### Seguridad
- El rol de la UI es solo ergonomía: toda decisión se refuerza con reglas de API (feature 005).
- Un admin con `active = false` se trata como sin sesión.
- Los mensajes de error de PocketBase se muestran sin volcar objetos completos ni tokens.

### Referencias
- https://primevue.org/toast/ · https://primevue.org/confirmdialog/ · https://primevue.org/datatable/
- https://router.vuejs.org/guide/advanced/meta.html
- https://github.com/pocketbase/js-sdk
- https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat

### Fuera de alcance
- Vistas de negocio (007 en adelante), gestión de equipo (007).
- Internacionalización, modo oscuro conmutable y caché de datos.
- Badges o contadores reales en el menú (si se necesitan, los añade el módulo correspondiente con datos verdaderos).

---

## Criterios de Aceptación

- [x] `useAuth().role`, `isOwner` y `can()` reflejan el rol del admin; sin sesión o con `active = false` no hay permisos.
- [x] Una ruta con `meta.roles` redirige a `/forbidden` a un rol no permitido y la vista 403 se muestra dentro del layout.
- [x] `useCollection` lista con paginación, orden y filtro parametrizado, y traduce errores de PocketBase a mensajes y errores por campo.
- [x] Los componentes compartidos existen con pruebas; `Toast` y `ConfirmDialog` funcionan desde cualquier vista.
- [x] `formatDateTime`, `localToUtcIso` y `formatUsd`/`parseUsdToCents` pasan los casos límite (cambios de horario, centavos).
- [x] El menú no tiene badges ni entradas sin módulo y se filtra por rol.
- [x] `scripts/verify-app.sh` termina en verde y `app/README.md` documenta la base de módulos.

---

## Dependencias Entre Tareas

```
Feature 005 (role, active)   → 001, 004
001 (tipos)                  → 004, 006
002 (datetime y money)       → 009
003 (toast y confirm)        → 006, 007
004 (useAuth y permisos)     → 005, 008
005 (guard y 403)            → 008
006 (useCollection)          → 007, 009
007 (componentes)            → 009
008 (admin-nav)              → 009
001-008                      → 009 (pruebas, README y verificación)
```

---

## Validación Post-Deploy

1. `scripts/verify-app.sh` en verde.
2. `cd app && bun run dev`: iniciar sesión como owner y como coach; el menú oculta lo restringido y abrir una ruta con `meta.roles` ajena muestra `/forbidden`.
3. Comprobar que el menú ya no muestra números ni «Rutinas», «Suscripciones» ni «Notificaciones».
4. Desde la consola del navegador, `formatDateTime('2026-03-08T07:30:00Z')` devuelve hora de Nueva York coherente con el cambio de horario.

---

## Prompt y modelo utilizado

### Modelo

Sonnet 5.5

### Contexto: lista de características aprobada

Lista aprobada por el usuario (features 005-019, CRM/leads descartado explícitamente; clientes sí; comunicaciones solo propias del servicio): 005 fundamentos de API (roles y auditoría), 006 base de módulos de la app, 007 equipo y coaches (adelantada desde v2), 008 catálogo de servicios y planes, 009 horarios y clases, 010 clientes, 011 reservas y asistencia, 012 dashboard operativo (MVP); 013 membresías y créditos, 014 pagos y recibos, 015 agenda de personal training y sesiones especiales, 016 online coaching, 017 reportes, 019 catálogo público en web (v2); 018 comunicaciones del servicio (v2/después).

### Prompt

```
Ok, con base en esta lista estructuremos los features que debemos implementar. Cada feature dejala plasmada en español en features/NNN-.../spec.md, crea las carpetas de ser necesario respetando el consecutivo, puedes usar features/spec-template.md como plantilla. Luego con base en ese spec crea las tareas granulares en features/NNN-.../tasks/NNN-....md, creando un consecutivo ordenado, tasks debidamente priorizadas teniendo en cuenta dependencias resueltas con anterioridad, puedes usar features/task-template.md como plantilla. Ten en cuenta la prelación entre unas y otras de manera de generar todo con la prioridad y orden adecuado.
```
