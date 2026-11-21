# Especificación: Equipo y coaches

- **Estado:** Completado

## Resumen Ejecutivo

Este conjunto de 9 tareas entrega la gestión del equipo de JQ Fitness: listado y alta de administradores (solo owner, con contraseña inicial), ficha de cada integrante (que también es la ficha del coach), edición de rol y estado, avatar, desactivación en lugar de borrado cuando el admin tiene registros asociados, perfil propio en Ajustes con cambio de contraseña y una vista de permisos por rol. No implementa horarios ni clases del coach (feature 009, que se enlazará desde la ficha) ni servicios (008).

**Por qué se adelanta desde v2:** los coaches son una dependencia directa de lo que viene en el MVP: `services.default_coach` (008), `class_templates.coach` y `class_sessions.coach` (009) y `bookings.marked_by` (011) son relaciones a `admins`. Sin una gestión de equipo real no hay a quién asignar clases ni quién marque asistencia, y el owner tendría que crear cuentas desde el panel `/_/`. Además la feature 005 cerró el registro abierto, así que alta, desactivación y recuperación de acceso deben existir en la app.

Entrega:

1. **Reglas de equipo en API**: campos `phone` y `bio`; hook que impide quitar al último owner activo, desactivarse a uno mismo y borrar admins con registros asociados (responde 409 para que la UI ofrezca desactivar).
2. **Vista `/team`**: lista con búsqueda y filtros por rol y estado, alta con contraseña inicial (con generador), cambio de rol y desactivación.
3. **Ficha `/team/:id`**: datos, avatar, rol, estado, biografía y una sección «Horario y clases» reservada para 009; matriz de permisos por rol visible.
4. **Perfil propio `/settings/profile`**: nombre, avatar, teléfono y cambio de contraseña.
5. **Navegación**: sustituye el marcador `Equipo` de `admin-nav.ts` por la entrada real, añade «Mi perfil» y enlaza «Ajustes» del menú de usuario.

Contrato que deja a las siguientes features: `useTeam().coaches` (admins activos con rol `coach` u `owner` para selectores), `ADMIN_REFERENCES` en el API (lista de relaciones a `admins` que cada feature amplía) y `RolePermissions` para mostrar permisos.

---

## Estado actual del repositorio (punto de partida)

| Elemento | Estado |
|----------|--------|
| Features 005 y 006 | Según contrato: `admins` con `role`/`active` y reglas cerradas; `audit_logs`; `rules.ts`, `audit.ts`; en la app `useAuth.can()`, `useCollection`, componentes compartidos, `meta.roles`, tipos `Admin` |
| Colección `admins` | `name`, `avatar`, `email`, `role`, `active` (005). No tiene `phone` ni `bio` |
| `api/src/hooks/admins.ts` | Creado en 005 con los valores por defecto de `role` y `active` (esta feature lo amplía) |
| `app/src/layouts/admin-nav.ts` | Marcador `Equipo` (`/team`, `placeholder: true`) en el grupo Ajustes (006) |
| `app/src/layouts/AdminLayout.vue` | El menú de usuario tiene «Ajustes» sin destino |
| Archivos que esta feature crea | `team-guards.ts`, `useTeam`, `TeamView`, `TeamMemberView`, `ProfileView`, `RolePermissions` y rutas: no existen |
| Datos | Admins existentes ya son `owner` (005) |

> Verificación obligatoria previa: la tarea 003 debe confirmar en el binario `api/pb` que `throw new ApiError(409, ...)` y `findRecordsByFilter` están disponibles en el JSVM, y el comportamiento de PocketBase al actualizar contraseña (`oldPassword`, `password`, `passwordConfirm`) invalidando el token vigente.

---

## Contrato

### Reglas de negocio del equipo (API)

| Operación | Condición | Respuesta |
|-----------|-----------|-----------|
| Cambiar `role` o `active` de un admin | El resultado dejaría 0 owners activos | `400` «Debe quedar al menos un owner activo» |
| Poner `active = false` en uno mismo | Siempre | `400` «No puedes desactivarte a ti mismo» |
| Borrar un admin | Existen registros que lo referencian (`ADMIN_REFERENCES`, incluye `audit_logs.actor`) | `409` «Tiene registros asociados; desactívalo en su lugar» |
| Borrar un admin | Sin referencias, no es el último owner, no es uno mismo | Permitido (reglas de 005) |

### Alta de admin (UI → API)

`POST /api/collections/admins/records` con `email`, `password`, `passwordConfirm`, `name`, `role`, `active: true`, `emailVisibility: true`; solo owner (regla de 005). La contraseña inicial se comunica en persona; el admin la cambia en `/settings/profile`.

---

## Modelo de datos

### Colección `admins` (extensión)

| Campo | Tipo | Reglas | Descripción |
|-------|------|--------|-------------|
| `phone` | text | máximo 30, patrón de teléfono permisivo | Teléfono de contacto |
| `bio` | text | máximo 600 | Presentación del coach para uso interno (y futuro web) |

- **Reglas de API:** sin cambios respecto a 005; `phone` y `bio` se editan con la misma `updateRule` (owner o el propio registro).
- **Relaciones y borrado:** `ADMIN_REFERENCES` en `api/src/lib/team-guards.ts`: `[{ collection: "audit_logs", field: "actor" }]` hoy; 008 añade `services.default_coach`, 009 `class_templates.coach`, `class_sessions.coach`, 011 `bookings.marked_by`, 014 `payments.recorded_by`.

---

## Arquitectura de Cambios

### Fase 1: API de equipo (Tareas 001-003)

**001 - Migración de `phone` y `bio`**
- `api/pb_migrations/1795262000_updated_admins_phone_bio.js`: añade ambos campos; `down` los elimina.

**002 - Lógica pura de reglas de equipo**
- `api/src/lib/team-guards.ts`: `ADMIN_REFERENCES`, `checkAdminChange({ before, after, actorId, activeOwners })` → `null` o `{ status, message }` (último owner, auto-desactivación, bajada de rol propia del último owner) y `canDeleteAdmin({ referencesCount, isLastOwner, isSelf })`.
- `api/src/lib/team-guards.test.ts`: cada caso de la tabla de contrato más combinaciones (owner → coach con otro owner activo, desactivar owner con otro activo, etc.).

**003 - Hook de protección de admins**
- Amplía `api/src/hooks/admins.ts`: `onRecordUpdateRequest("admins")` que carga el original, cuenta owners activos y llama a `checkAdminChange`; `onRecordDeleteRequest("admins")` que cuenta referencias en cada colección de `ADMIN_REFERENCES` (omite las que no existan con `try/catch` de `findCollectionByNameOrId`) y lanza `ApiError(409, ...)`. Dentro de cada callback `require(`${__hooks}/lib/team-guards`)`.
- Comprobación manual documentada: último owner, auto-desactivación, borrado con auditoría (409).

### Fase 2: Datos y componentes de la app (Tareas 004-005)

**004 - Composable `useTeam` y utilidades**
- `app/src/composables/useTeam.ts`: sobre `useCollection<Admin>("admins")` añade `createMember(data)` (arma `password`/`passwordConfirm`), `setRole(id, role)`, `setActive(id, active)`, `uploadAvatar(id, file)` (`FormData`), `deleteOrDeactivate(member)` (intenta borrar; ante `409` devuelve `{ deactivated: false, needsDeactivate: true }` y deja la decisión a la vista), y `coaches` (computed/consulta de admins activos con rol `coach` u `owner`, orden por nombre).
- `app/src/lib/password.ts`: `generatePassword(length = 12)` con `crypto.getRandomValues`, sin caracteres ambiguos; `validatePassword(text)` (mínimo 8, mensaje en español).
- Pruebas con `pb` mockeado.

**005 - Componentes de equipo**
- `app/src/components/team/RolePermissions.vue`: tabla de permisos por rol construida desde `PERMISSIONS` (`src/lib/permissions.ts`) con etiquetas en español; resalta el rol indicado por prop.
- `app/src/components/team/MemberForm.vue`: formulario de alta/edición (`name`, `email`, `role`, `phone`, `bio`, contraseña inicial con botón «Generar» solo en alta), validación por campo y errores de API (`fields`).
- `app/src/components/team/MemberAvatar.vue`: avatar con foto o iniciales; carga de imagen (máx. 2 MB, tipos imagen).
- Pruebas de render y validaciones.

### Fase 3: Vistas y rutas (Tareas 006-008)

**006 - Vista `TeamView` (`/team`)**
- `app/src/views/admin/TeamView.vue`: `PageHeader` con «Nuevo integrante» (solo con `can("team.manage")`), `DataToolbar` (búsqueda por nombre/correo y filtros por rol y estado), `DataTable` con avatar, nombre, correo, rol (`StatusTag`), estado y acciones (ver ficha, activar/desactivar, eliminar con `useConfirmDelete`; si el borrado devuelve 409 se ofrece «Desactivar»). Estado vacío con `EmptyState`. Los coaches y recepción ven la lista sin acciones de gestión.
- Diálogo de alta con `MemberForm`.
- Pruebas de la vista con `useTeam` mockeado.

**007 - Ficha del miembro y perfil propio**
- `app/src/views/admin/TeamMemberView.vue` (`/team/:id`): datos, avatar, rol, estado, biografía, `RolePermissions` para su rol y un bloque «Horario y clases» con texto «Disponible próximamente» (la feature 009 lo reemplaza con el horario real). Edición solo para owner; el propio usuario edita su perfil desde Ajustes.
- `app/src/views/admin/ProfileView.vue` (`/settings/profile`): formulario de nombre, teléfono y avatar y una segunda tarjeta de cambio de contraseña (`oldPassword`, `password`, `passwordConfirm`); tras cambiarla PocketBase invalida el token, así que se reautentica con `pb.collection("admins").authWithPassword(email, nuevaContraseña)` y se avisa con `useNotify`.
- Pruebas de ambas vistas.

**008 - Rutas y navegación**
- Rutas hijas de `AdminLayout`: `team` (`/team`, `meta.title: "Equipo"`), `team-member` (`/team/:id`, `meta.title: "Ficha del equipo"`), `profile` (`/settings/profile`, `meta.title: "Mi perfil"`). Sin `meta.roles` restrictivos para ver (todos los roles ven el equipo, la edición está protegida por permiso y API).
- `admin-nav.ts`: retirar `placeholder` de `Equipo` y añadir `Mi perfil` (`/settings/profile`, `pi pi-user`) en el grupo Ajustes. `AdminLayout.vue`: la entrada «Ajustes» del menú de usuario apunta a `/settings/profile`.
- Actualizar pruebas de router y de `admin-nav`.

### Fase final: Verificación y cierre (Tarea 009)

**009 - Documentación y verificación**
- `api/README.md`: sección «Equipo: reglas y `ADMIN_REFERENCES`» (cómo añadir una relación a `admins`); `app/README.md`: sección «Equipo y perfil».
- `scripts/verify-api.sh` y `scripts/verify-app.sh` en verde; criterios de aceptación revisados; feature marcada como `Completado`.

---

## Impacto por Módulo

| Ruta | Cambio |
|------|--------|
| `api/pb_migrations/` | `1795262000_updated_admins_phone_bio.js` |
| `api/src/lib/` | `team-guards.ts` (+ prueba) |
| `api/src/hooks/` | `admins.ts` ampliado |
| `app/src/composables/` | `useTeam.ts` |
| `app/src/lib/` | `password.ts` |
| `app/src/components/team/` | `RolePermissions.vue`, `MemberForm.vue`, `MemberAvatar.vue` |
| `app/src/views/admin/` | `TeamView.vue`, `TeamMemberView.vue`, `ProfileView.vue` |
| `app/src/router/index.ts`, `app/src/layouts/` | Rutas y navegación reales |
| `api/README.md`, `app/README.md` | Documentación |

---

## Flujos Críticos

### Flujo 1: Alta de un coach
```
1. El owner abre /team → «Nuevo integrante», rellena nombre, correo, rol=coach y pulsa «Generar» contraseña
2. useTeam.createMember → POST admins (createRule solo owner) y el hook de 005 deja active=true
3. audit_logs registra el alta; el owner comunica la contraseña inicial en persona
4. Resultado: el coach inicia sesión y cambia su contraseña desde /settings/profile
```

### Flujo 2: Borrar un admin con registros
```
1. El owner pulsa «Eliminar» en un coach con clases asignadas (o con entradas en audit_logs)
2. El hook responde 409 «Tiene registros asociados»
3. La vista ofrece «Desactivar»; al aceptar, setActive(id, false)
4. Resultado: el coach conserva su historial pero ya no inicia sesión ni aparece en selectores
```

### Flujo 3: Último owner
```
1. El único owner activo intenta pasar su rol a coach o desactivarse
2. El hook (checkAdminChange) responde 400 con el motivo
3. Resultado: siempre queda al menos un owner activo
```

### Flujo 4: Cambio de contraseña propio
```
1. El usuario abre /settings/profile e ingresa la contraseña actual y la nueva
2. PocketBase actualiza y revoca el token anterior; la app reautentica y avisa
3. Resultado: sesión continúa con la nueva contraseña; contraseña actual incorrecta → error en el campo
```

---

## Notas de Implementación

### Decisiones
- **Desactivar antes que borrar**: con `ADMIN_REFERENCES` el servidor decide; la UI no cuenta registros. Alternativa descartada: `cascadeDelete` de relaciones, que borraría historial de clases y asistencia.
- **`ADMIN_REFERENCES` como lista central**: cada feature que crea una relación a `admins` la añade en el mismo PR; el hook ignora colecciones que aún no existen, por lo que funciona con el orden de entrega de features.
- **Contraseña inicial definida por el owner** (sin flujo de invitación por correo): no hay servicio SMTP garantizado; la recuperación sigue disponible en `/forgot-password`.
- **Ficha única para el coach**: el coach es un `admins` con `role = coach`; no se crea una colección aparte.
- **Roles con permisos visibles**: la matriz de `permissions.ts` se muestra tal cual, de modo que lo que ve el usuario coincide con lo que aplica la UI.

### Migraciones
- `<timestamp>_<verbo>_<objeto>.js` con `up` y `down`; timestamp posterior al de 005 (`1795261200`).

### Convención de código
- Lógica pura en `api/src/lib/team-guards.ts`; el hook solo carga datos y delega.
- Vistas de equipo en `views/admin/`, componentes específicos en `components/team/`.

### Seguridad
- Toda restricción (owner-only, último owner, borrado) se aplica en API; la UI solo oculta.
- Las contraseñas no se registran en `audit_logs` (redacción de 005) ni se vuelven a mostrar tras el alta.
- `emailVisibility` activo solo porque el equipo es interno y listable por staff.

### Referencias
- https://pocketbase.io/docs/js-event-hooks/
- https://pocketbase.io/docs/api-records/#update-record (cambio de contraseña con `oldPassword`)
- https://pocketbase.io/docs/files-handling/

### Fuera de alcance
- Horario, clases y disponibilidad del coach (009, 015); selección de coach en servicios (008).
- Invitaciones por correo, doble factor y gestión de sesiones.
- Página pública de coaches en `web/` (019).

---

## Criterios de Aceptación

- [x] Un owner da de alta un admin con rol y contraseña inicial desde `/team`; coach y recepción no ven el botón y la API rechaza el intento (`403`).
- [x] El último owner activo no puede ser desactivado, degradado ni borrado; nadie puede desactivarse a sí mismo.
- [x] Borrar un admin con registros asociados devuelve `409` y la UI ofrece desactivarlo; un admin desactivado no inicia sesión.
- [x] La ficha `/team/:id` muestra datos, avatar, rol, estado, biografía y los permisos del rol; incluye el espacio reservado para el horario.
- [x] `/settings/profile` permite cambiar nombre, avatar, teléfono y contraseña (con contraseña actual) y la sesión continúa.
- [x] El menú muestra «Equipo» y «Mi perfil» reales y «Ajustes» del menú de usuario lleva al perfil.
- [x] Las altas, cambios y bajas de admins quedan en `audit_logs` sin contraseñas.
- [x] `scripts/verify-api.sh` y `scripts/verify-app.sh` terminan en verde.

---

## Dependencias Entre Tareas

```
Feature 005 (reglas y audit)  → 001, 002
001 (phone, bio)              → 003, 005
002 (team-guards)             → 003
Feature 006 (base de módulos) → 004, 005
004 (useTeam)                 → 006, 007
005 (componentes)             → 006, 007
003, 006, 007                 → 008 (rutas y navegación)
001-008                       → 009 (documentación y verificación)
```

---

## Validación Post-Deploy

1. `scripts/verify-api.sh` y `scripts/verify-app.sh` en verde.
2. Como owner: crear un coach en `/team`, iniciar sesión con él en otra ventana y confirmar que no ve acciones de gestión.
3. Intentar desactivar al único owner → error visible; intentar borrar un admin con entradas en `audit_logs` → ofrece desactivar.
4. Cambiar la contraseña desde `/settings/profile` y volver a entrar con la nueva.
5. `audit_logs` en `/_/` muestra el alta y los cambios sin campos de contraseña.

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
