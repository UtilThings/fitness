# Especificación: Dashboard operativo, auditoría y cierre del MVP

- **Estado:** Pendiente

## Resumen Ejecutivo

Este conjunto de 8 tareas sustituye el marcador de posición de `/` por un panel operativo (clases de hoy con ocupación, clientes activos, reservas del día y en espera, sesiones que requieren atención), añade la vista de auditoría para el owner (`/audit`) y cierra el MVP con una checklist de aceptación y un script de verificación global. No implementa cobros (014): deja un marcador claro para «cobros por vencer».

Entrega:

1. **Resumen del día** con la ruta `GET /api/admin/dashboard` (staff), cálculo correcto del «hoy» en `America/New_York` (incluidos los cambios de horario) mediante lógica pura probada.
2. **Dashboard en `/`**: tarjetas de clases de hoy (con ocupación y disponibilidad), clientes activos, reservas del día y en espera, sesiones sin coach o sin reservas, y un placeholder de «Cobros por vencer» que activa la feature 014.
3. **Auditoría en `/audit`** (solo owner): lista paginada de `audit_logs` con filtros por colección, actor y fecha, y detalle del diff.
4. **Cierre del MVP**: pruebas, documentación, checklist de aceptación de las features 005-012 y `scripts/verify-mvp.sh`.

Contrato que deja a las siguientes features: la clave `upcoming_payments` del resumen (014 la rellena), el patrón de tarjetas del dashboard (013, 017) y `AuditView` como punto de consulta de toda colección auditada.

---

## Estado actual del repositorio (punto de partida)

| Elemento | Estado |
|----------|--------|
| `app/src/views/admin/DashboardView.vue` | Marcador: título «Panel de administración» y una `Card` «Aquí irán las métricas del gimnasio» |
| `app/src/layouts/admin-nav.ts` | `Dashboard` → `/` en el grupo `Análisis`; marcadores y badges falsos los retira la 006 |
| `app/src/lib/datetime.ts` | Lo crea una feature previa (conversión a `America/New_York` con `Intl`); no existe aún en disco |
| `api/src/lib/`, `api/src/hooks/` | `utils.ts` y `users.ts`; 005-011 añaden auditoría, `booking-rules`, endpoints y hooks |
| `audit_logs` | Definida por 005 (`actor`, `action`, `collection`, `record_id`, `summary`, `diff`, `created`); lectura solo owner |
| `class_sessions`, `bookings`, `clients` | Definidas por 009-011; consumidas aquí en solo lectura |
| `scripts/` | `verify-app.sh` y `verify-web.sh`; `verify-api.sh` lo crea 005 |
| Cobros por vencer | No existe `payments` (014 es v2) |

> Verificación obligatoria previa: la tarea 001 debe comprobar qué ofrece goja para fechas (`Intl`, `toLocaleString` con `timeZone`) y qué helper de zona horaria dejó la feature 009; solo si ninguno basta se crea `api/src/lib/tz.ts` con las reglas de horario de verano de EE. UU. (segundo domingo de marzo a primer domingo de noviembre, 02:00 local).

---

## Contrato HTTP

### Rutas

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/admin/dashboard?days=7` | staff | Resumen operativo del día y de los próximos `days` días (1-14) |
| `GET` | `/api/collections/audit_logs/records` | owner | Lista paginada con filtros (API estándar, regla de 005) |

### Respuesta de `/api/admin/dashboard`

```
{
  "generated_at": "2026-11-21T15:04:05Z",
  "timezone": "America/New_York",
  "today": { "date": "2026-11-21", "start_utc": "...", "end_utc": "..." },
  "counts": {
    "active_clients": 42, "sessions_today": 5,
    "bookings_today": 21, "waitlisted_today": 2,
    "sessions_without_coach": 1, "sessions_without_bookings": 2
  },
  "sessions_today": [
    { "id": "...", "service": { "id": "...", "name": "...", "kind": "group" },
      "starts_at": "...", "duration_min": 60,
      "coach": { "id": "...", "name": "..." } ,
      "capacity": 6, "booked": 4, "waitlisted": 1, "spots_left": 2,
      "availability": "almost", "status": "scheduled" }
  ],
  "attention": [ { "session_id": "...", "reason": "no_coach" | "no_bookings", "starts_at": "..." } ],
  "upcoming_payments": null
}
```

- `sessions_today`: sesiones `scheduled` y `completed` del día local, ordenadas por hora; `coach` es `null` si falta.
- `attention`: sesiones `scheduled` desde ahora hasta `days` días sin coach o sin reservas `booked`.
- `bookings_today`: reservas `booked`, `attended` y `no_show` de las sesiones de hoy; `waitlisted_today`: `waitlisted`.
- `upcoming_payments`: `null` hasta que 014 lo rellene con `{ count, total_cents, items }`.

### Errores

| Condición | Respuesta |
|-----------|-----------|
| Sin sesión o usuario no staff | `401` / `403` |
| `days` fuera de 1-14 | `400` |

---

## Modelo de datos

Sin colecciones nuevas. Se leen `class_sessions`, `bookings`, `clients`, `services`, `admins` y `audit_logs`.

- **Reglas de API:** `audit_logs` ya restringe `listRule`/`viewRule` al owner (005); la ruta del dashboard comprueba staff en el servidor.
- **Índices:** si las consultas de auditoría por `collection` o `created` resultaran lentas, la tarea 005 propone un índice en `audit_logs`; hoy no se asume.

---

## Arquitectura de Cambios

### Fase 1: Resumen operativo en la API (Tareas 001-002)

**001 - Lib del resumen y límites del día local**
- `api/src/lib/dashboard.ts` (puro): `localDayBoundsUtc(now, timeZone)`, `summarizeSessions(sessions, bookings, now)`, `buildAttention`, `buildCounts`.
- Pruebas `api/src/lib/dashboard.test.ts` con `bun test`, incluyendo días de cambio de horario de EE. UU., medianoche local y UTC distinto de la fecha local.

**002 - Endpoint `GET /api/admin/dashboard`**
- `api/src/hooks/dashboard.ts` con `routerAdd`: carga sesiones del día y de la ventana, reservas agrupadas, clientes activos; usa la lib; devuelve la respuesta del contrato con `upcoming_payments: null`.

### Fase 2: Dashboard en la app (Tareas 003-004)

**003 - Composable y tarjetas**
- `app/src/composables/useDashboard.ts` (carga, `refresh`, autorefresco cada 60 s mientras la pestaña está visible).
- Componentes en `app/src/components/dashboard/`: `StatCard.vue`, `TodayClassesCard.vue` (barra de ocupación y `AvailabilityTag` de 011), `AttentionCard.vue`, `UpcomingPaymentsCard.vue` (placeholder).

**004 - `DashboardView` y navegación**
- Reemplaza el marcador de `DashboardView.vue` por el panel; enlaces a `/clients`, `/classes` y a la sesión; actualiza `admin-nav.ts` si quedara algún marcador del Dashboard.

### Fase 3: Auditoría (Tareas 005-006)

**005 - Composable de auditoría**
- `app/src/lib/audit.ts` (etiquetas de acción, formato de diff, construcción del filtro) y `app/src/composables/useAuditLogs.ts` (paginación, filtros por colección, actor y rango de fechas, `expand=actor`).

**006 - Vista `/audit`, ruta y navegación**
- `app/src/views/admin/AuditView.vue`: tabla paginada con filtros y detalle del diff en un panel; ruta `/audit` restringida al owner y entrada en `admin-nav.ts` visible solo para owner.

### Fase 4: Pruebas y cierre del MVP (Tareas 007-008)

**007 - Pruebas y documentación**
- Pruebas Vitest de `useDashboard`, tarjetas, `lib/audit.ts` y `AuditView`; documentación del endpoint y de la auditoría en `api/README.md` y `app/README.md`.

**008 - Checklist del MVP y script de verificación**
- `scripts/verify-mvp.sh` (ejecuta `verify-api.sh` y `verify-app.sh` y comprueba que existan las migraciones y rutas esperadas de 005-012); sección «Aceptación del MVP» en `app/README.md` (o `api/README.md`) con el recorrido completo; marcar las features 005-012 como completadas.

---

## Impacto por Módulo

| Ruta | Cambio |
|------|--------|
| `api/src/lib/` | `dashboard.ts`, `dashboard.test.ts` (y `tz.ts` solo si hace falta) |
| `api/src/hooks/` | `dashboard.ts` |
| `app/src/lib/`, `app/src/composables/` | `audit.ts`, `useDashboard.ts`, `useAuditLogs.ts` |
| `app/src/components/dashboard/` | `StatCard`, `TodayClassesCard`, `AttentionCard`, `UpcomingPaymentsCard` |
| `app/src/views/admin/` | `DashboardView.vue` (reescrita), `AuditView.vue` |
| `app/src/router/index.ts`, `app/src/layouts/admin-nav.ts` | Ruta `/audit` (owner) y entrada de navegación |
| `scripts/` | `verify-mvp.sh` |
| `api/README.md`, `app/README.md` | Documentación y checklist del MVP |

---

## Flujos Críticos

### Flujo 1: Panel al abrir el día
```
1. Recepción entra a / a las 8:00 (hora de Miramar)
2. GET /api/admin/dashboard calcula el día local en America/New_York → rango UTC correcto
3. La UI muestra las clases de hoy con ocupación, reservas del día y en espera, y las sesiones sin coach
4. Resultado: el equipo detecta de un vistazo clases sin coach o vacías
```

### Flujo 2: Día de cambio de horario
```
1. En el domingo de cambio de hora el día local dura 23 o 25 horas
2. localDayBoundsUtc devuelve inicio y fin en UTC según el desfase vigente en cada extremo
3. Resultado: ninguna clase del día queda fuera ni se cuenta en el día contiguo
```

### Flujo 3: Auditoría
```
1. El owner abre /audit, filtra colección = bookings, actor = una recepcionista y un rango de fechas
2. La API devuelve la página con los cambios; el panel muestra el diff de uno
3. Un coach que abre /audit es redirigido y la API le responde 403 en audit_logs
4. Resultado: trazabilidad solo para el owner
```

---

## Notas de Implementación

### Decisiones
- **Un solo endpoint de resumen** (en lugar de varias llamadas): menos viajes, y el servidor aplica la zona horaria una sola vez.
- **Zona horaria en el servidor con helper puro**: goja no tiene `Intl` fiable; se verifica primero y, de ser necesario, se usan las reglas fijas de horario de verano de EE. UU.
- **Autorefresco simple (60 s)** en lugar de suscripciones en tiempo real; tiempo real queda fuera del MVP.
- **Ventana de «atención»**: sesiones desde ahora hasta 7 días (configurable con `days`, máx. 14); `no_bookings` considera solo reservas `booked`.
- **Auditoría con la API estándar** de `audit_logs` (filtros PocketBase) en vez de una ruta custom: la regla de owner de 005 ya protege los datos.
- **Restricción por rol de la ruta `/audit`**: se usa el mecanismo de roles de la navegación y el router de 005/006; si no hubiera guard por rol, la tarea 006 añade un `meta.roles` mínimo comprobado en el guard del router.
- **Placeholder de cobros**: tarjeta visible con «Disponible con Pagos»; 014 solo rellena `upcoming_payments` y activa la tarjeta.

### Convención PocketBase JS
- Lógica en `api/src/lib/dashboard.ts`; el hook hace `require(`${__hooks}/lib/dashboard`)` dentro del handler.

### Seguridad
- El dashboard exige staff y no expone datos personales de clientes (solo conteos y datos de sesiones y coach).
- `/audit` solo para owner, en UI y en API; los diffs pueden contener datos sensibles (evaluación, notas), por eso no se muestran a otros roles.

### Referencias
- https://pocketbase.io/docs/js-routing/
- https://pocketbase.io/docs/api-records/#listsearch-records
- https://www.nist.gov/pml/time-and-frequency-division/popular-links/daylight-saving-time (reglas de horario de verano de EE. UU.)

### Fuera de alcance
- Cobros por vencer y reportes (014, 017); gráficas históricas.
- Notificaciones en tiempo real y exportación de la auditoría.
- Edición o eliminación de `audit_logs`.

---

## Criterios de Aceptación

- [ ] `GET /api/admin/dashboard` responde con la estructura del contrato solo a staff y calcula el día en `America/New_York`, también en cambios de horario.
- [ ] `/` muestra clases de hoy con ocupación y disponibilidad, clientes activos, reservas del día y en espera, y sesiones sin coach o sin reservas.
- [ ] «Cobros por vencer» aparece como placeholder claro hasta la feature 014.
- [ ] `/audit` lista `audit_logs` paginados con filtros por colección, actor y fecha, y muestra el diff; solo el owner accede (UI y API).
- [ ] La checklist de aceptación del MVP (005-012) está documentada y recorrida.
- [ ] `scripts/verify-mvp.sh` termina en verde.

---

## Dependencias Entre Tareas

```
Feature 011 (reservas, disponibilidad) → 001, 002
Feature 009 (helper de zona horaria)   → 001
Feature 005 (audit_logs, roles)        → 005, 006
001 (lib del resumen)                  → 002
002 (endpoint)                         → 003
003 (composable y tarjetas)            → 004
005 (composable de auditoría)          → 006
004, 006                               → 007 (pruebas y documentación)
007                                    → 008 (checklist y cierre del MVP)
```

---

## Validación Post-Deploy

1. `scripts/verify-mvp.sh` en verde.
2. `curl -H "Authorization: <token staff>" /api/admin/dashboard` devuelve `timezone = America/New_York` y las sesiones del día local; sin token responde `401`.
3. En la app, `/` coincide con los datos de `/classes` y de las reservas del día.
4. Como owner, `/audit` filtra por colección, actor y fecha; como coach, `/audit` redirige y `audit_logs` responde `403`.
5. Recorrer la checklist de aceptación del MVP de punta a punta.

---

## Prompt y modelo utilizado

### Modelo

Sonnet 5.5

### Prompt

```
Contexto: lista de características aprobada del panel de administración de JQ Fitness (CRM/leads descartado explícitamente; clients sí). Las features 005-019 se reparten esa lista según el contrato compartido.

Ok, con base en esta lista estructuremos los features que debemos implementar. Cada feature dejala plasmada en español en features/NNN-.../spec.md, crea las carpetas de ser necesario respetando el consecutivo, puedes usar features/spec-template.md como plantilla. Luego con base en ese spec crea las tareas granulares en features/NNN-.../tasks/NNN-....md, creando un consecutivo ordenado, tasks debidamente priorizadas teniendo en cuenta dependencias resueltas con anterioridad, puedes usar features/task-template.md como plantilla. Ten en cuenta la prelación entre unas y otras de manera de generar todo con la prioridad y orden adecuado.
```
