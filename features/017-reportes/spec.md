# Especificación: Reportes de ocupación, asistencia, ingresos y retención

- **Estado:** Completado

## Resumen Ejecutivo

Este conjunto de 9 tareas añade el módulo de reportes del panel de administración: rutas custom `GET /api/admin/reports/*` en PocketBase, con la agregación en una librería pura y probada, y la vista `/reports` en `app/` con pestañas, gráficos y exportación a CSV. No crea colecciones nuevas: lee `class_sessions`, `bookings`, `services`, `plans`, `memberships` y `payments`. No incluye reportes de CRM ni de marketing (fuera de alcance de todo el proyecto).

Entrega:

1. **Librería de agregación pura** (`api/src/lib/reports-*.ts`): rango de fechas en zona `America/New_York`, ocupación por clase y por servicio, asistencia y tasa de no-show, ingresos por plan, servicio y periodo, retención y bajas de membresías. Sin acceso a PocketBase; probada con `bun test`.
2. **Rutas `GET /api/admin/reports/{occupancy,attendance,revenue,retention}`**: cargan los datos del rango, llaman a la librería y devuelven JSON. Staff para datos operativos; solo `owner` para ingresos.
3. **Vista `/reports`** con pestañas (Ocupación, Asistencia, Ingresos, Retención), filtro de rango de fechas, tarjetas de totales, gráficos y tabla de detalle. Las pestañas visibles dependen del rol: los coaches no ven ingresos.
4. **Exportación a CSV** en el cliente (`app/src/lib/csv.ts`): escape correcto (RFC 4180), BOM UTF-8 para Excel y neutralización de inyección de fórmulas.

Contrato que deja a las siguientes features: ninguna depende de reportes; el contrato de respuesta JSON de la sección siguiente queda documentado en `api/README.md` por si se añaden más reportes.

---

## Estado actual del repositorio (punto de partida)

| Elemento | Estado |
|----------|--------|
| `api/src/hooks/` | Solo `users.ts` (hook de ejemplo; 005 lo limpia). Las rutas de este módulo van en `api/src/hooks/reports.ts` |
| `api/src/lib/` | Solo `utils.ts`. Las features 005, 009 y 013/014 añaden helpers de roles, zona horaria y membresías (solo por contrato) |
| `api/pb_migrations/` | Última: `1795260843_created_admins.js`. Esta feature no añade migraciones |
| Pruebas de API | No existe script `test` (lo añade 005); esta feature usa `bun test` sobre `api/src/lib/*.test.ts` |
| `app/package.json` | PrimeVue `^5.0.5`, Vue 3.5, Vitest. No hay `chart.js` instalado |
| `app/src/views/admin/` | Vistas de 006-016 (solo por contrato) |
| `app/src/layouts/admin-nav.ts` | Navegación centralizada; 006 la deja sin badges falsos |
| Archivos de esta feature | `reports-*.ts`, `hooks/reports.ts`, `csv.ts`, `useReports.ts`, `ReportChart.vue`, `ReportsView.vue`: no existen (esta feature los crea) |
| Datos | Sin datos previos: los reportes son de solo lectura y deben soportar rangos vacíos (todo en cero, sin divisiones por cero) |

> Verificación obligatoria previa: la tarea 001 debe comprobar qué ofrece goja (`Intl`, `Date`) y si 009 ya aportó un helper de zona horaria en `api/src/lib/`; en ese caso se reutiliza en lugar de duplicarlo. Debe confirmar también el comportamiento de `$app.findRecordsByFilter` con límites altos antes de decidir la estrategia de carga del endpoint.

---

## Contrato HTTP

### Rutas

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/admin/reports/occupancy` | staff | Ocupación por clase (sesión) y por servicio |
| `GET` | `/api/admin/reports/attendance` | staff | Asistencia, no-show y cancelaciones por servicio y por día |
| `GET` | `/api/admin/reports/revenue` | owner | Ingresos por plan, servicio y periodo |
| `GET` | `/api/admin/reports/retention` | staff | Altas, bajas y retención de membresías |

Todas llevan `apis.requireAuth("admins")` más la comprobación de rol dentro del handler (staff = `active = true`; owner = además `role = "owner"`). Un coach no puede leer ingresos aunque llame a la API directamente.

### Parámetros

| Parámetro | Obligatorio | Descripción |
|-----------|-------------|-------------|
| `from` | Sí | Fecha local inicial `YYYY-MM-DD` (inclusive), zona `America/New_York` |
| `to` | Sí | Fecha local final `YYYY-MM-DD` (inclusive); `to >= from` y rango máximo 366 días |
| `service` | No | Slug de servicio para filtrar (`occupancy`, `attendance`, `revenue`) |
| `group_by` | No | Solo `revenue` y `retention`: `day`, `week` o `month` (por defecto `month`; `day` limitado a 92 días) |

El rango local se convierte a límites UTC `[from 00:00 local, to+1 00:00 local)`, respetando el cambio de horario de verano (23 o 25 horas en los días de transición).

### Respuestas (resumen)

Todas incluyen `range: { from, to, timezone, start_utc, end_utc }`.

| Reporte | Cuerpo |
|---------|--------|
| `occupancy` | `totals { sessions, capacity, booked, occupancy_rate }`, `by_service[] { service, name, sessions, capacity, booked, occupancy_rate }`, `by_class[] { session_id, starts_at, local_date, local_time, service, coach_name, capacity, booked, waitlisted, occupancy_rate }` (sesiones `cancelled` excluidas; `booked` = reservas `booked`, `attended` y `no_show`) |
| `attendance` | `totals { booked, attended, no_show, late_cancelled, cancelled, no_show_rate, attendance_rate }`, `by_service[]`, `by_day[]` |
| `revenue` | `totals { paid_cents, pending_cents, void_cents, payments }`, `by_plan[]`, `by_service[]`, `by_period[] { period, paid_cents, payments }`; importes en centavos USD; solo pagos `paid` suman ingresos, por `paid_at` |
| `retention` | `totals { active_start, new, churned, active_end, churn_rate, retention_rate }`, `by_plan[]`, `by_period[] { period, new, churned, active_end }` |

Definiciones fijas:

- `occupancy_rate = booked / capacity` (0 si `capacity = 0`).
- `no_show_rate = no_show / (attended + no_show)` (reservas que llegaron a su hora); `attendance_rate = attended / (attended + no_show)`.
- `churn_rate = churned / active_start`; `retention_rate = 1 - churn_rate` (0 y 1 si `active_start = 0`).
- Una baja es una membresía que pasa a `cancelled` o `expired` dentro del rango; la fecha de baja es `memberships.ended_on` (013), fijada por el sistema al cancelar o expirar; no se infiere de `audit_logs`.

### Errores

| Condición | Respuesta |
|-----------|-----------|
| Sin sesión o sin `admins` activo | `401` / `403` (`requireAuth`) |
| `coach` o `reception` en `revenue` | `403` |
| `from`/`to` ausentes, mal formados, `to < from` o rango > 366 días | `400` con mensaje en español |
| `service` inexistente | `400` |
| `group_by` inválido o `day` con rango > 92 días | `400` |

---

## Arquitectura de Cambios

### Fase 1: Lógica pura de agregación (Tareas 001-003)

**001 - Rango de fechas y zona horaria**
- `api/src/lib/reports-range.ts`: `parseRange(from, to)` (validación y errores tipados), `localDateToUtc(date)` con reglas de horario de verano de EE. UU. (segundo domingo de marzo a primer domingo de noviembre, 02:00), `utcToLocalParts(iso)`, `bucketKey(iso, groupBy)` (`day|week|month` en hora local; semana iniciada en domingo, igual que `web/src/lib/schedule.ts`).
- Reutiliza `api/src/lib/tz.ts` (feature 005, ampliado en 009). Pruebas: días de transición (2026-03-08, 2026-11-01), fin de año, rango de un día.

**002 - Agregación de ocupación y asistencia**
- `api/src/lib/reports-attendance.ts`: `aggregateOccupancy(sessions, bookings, opts)` y `aggregateAttendance(sessions, bookings, opts)`; entradas como objetos planos, salidas según el contrato; redondeo de tasas a 4 decimales. Pruebas: sesión sin reservas, sesión llena, sesión cancelada (excluida), tasas con denominador 0, `late_cancelled` fuera del denominador de no-show.

**003 - Agregación de ingresos y retención**
- `api/src/lib/reports-finance.ts`: `aggregateRevenue(payments, plans, services, opts)` y `aggregateRetention(memberships, plans, opts)`. Pagos `void` y `pending` no suman a `paid_cents`; pagos sin plan caen en el grupo `Sin plan`. Pruebas: periodos vacíos rellenados con ceros, pago en el límite de medianoche local, baja (`ended_on`) y alta en el mismo periodo, sin divisiones por cero, suma de grupos = total.

### Fase 2: API (Tarea 004)

**004 - Rutas `/api/admin/reports/*`**
- `api/src/hooks/reports.ts`: cuatro `routerAdd("GET", ...)` con `require(`${__hooks}/lib/reports-*`)` dentro de cada callback. Helper local `requireRole(e, "staff" | "owner")`.
- Carga de datos con `$app.findRecordsByFilter` / `$app.db()` limitada al rango UTC (índices por `starts_at`, `paid_at`); serializa los registros a objetos planos y delega en la librería. Sin datos personales en las respuestas (solo identificadores de sesión, nombres de servicio y de coach).
- Entradas en `scripts/verify-api.sh` (de 005): coach `403` en `revenue`, owner `200`, rango inválido `400`, sin token `401/403`.

### Fase 3: Exportación y cliente (Tareas 005-006)

**005 - Exportación a CSV**
- `app/src/lib/csv.ts`: `toCsv(columns, rows)` y `downloadCsv(filename, csv)`. Reglas: separador `,`, fin de línea `\r\n`, comillas dobles escapadas duplicándolas, entrecomillado si hay `,`, `"`, `\r` o `\n`; prefijo BOM `﻿`; celdas de texto que empiezan por `=`, `+`, `-`, `@`, tab o retorno de carro se prefijan con `'` (valores numéricos reales se escriben sin prefijo, de modo que `-5` numérico no se altera); nombre de archivo saneado `jq-reportes-<reporte>-<from>_<to>.csv`.
- Pruebas Vitest con casos de comas, comillas, saltos de línea, Unicode (ñ, acentos), fórmulas (`=HYPERLINK(...)`, `+1+1`, `@SUM`, `-2+3`), nulos y BOM.

**006 - Composable `useReports`**
- `app/src/composables/useReports.ts`: `useReports(kind)` con `range` (por defecto últimos 30 días locales), `service`, `groupBy`, `data`, `loading`, `error`, `load()` (usa `pb.send('/api/admin/reports/<kind>', { query })`, cancela peticiones obsoletas con `requestKey`) y presets (`7d`, `30d`, `mes actual`, `mes anterior`). Las fechas se calculan con `app/src/lib/datetime.ts` (zona `America/New_York`). Mapea `403` a un mensaje de permisos y `400` al mensaje del servidor.
- Pruebas con `pb.send` simulado: carga, error, presets en zona del negocio, petición obsoleta descartada.

### Fase 4: Interfaz (Tareas 007-008)

**007 - Componente `ReportChart`**
- Dependencia `chart.js` en `app/` (peer de `primevue/chart`). `app/src/components/reports/ReportChart.vue` envuelve el componente `Chart` de PrimeVue con carga diferida (`defineAsyncComponent`), tipos `bar`/`line`/`doughnut`, colores tomados de variables CSS de PrimeVue (primario esmeralda y superficies, con modo oscuro), `aria-label`, tabla alternativa accesible (el detalle tabular ya existe en la vista) y estado vacío.
- Pruebas Vitest del mapeo de datos a `ChartData` (función pura `buildChartData`) y de renderizado condicional (vacío/cargando).

**008 - Vista `/reports`, rutas y navegación**
- `app/src/views/admin/ReportsView.vue`: `Tabs` de PrimeVue (Ocupación, Asistencia, Ingresos, Retención), filtro de rango (`DatePicker` en modo rango + presets), filtro de servicio, tarjetas de totales, `ReportChart`, `DataTable` de detalle y botón «Exportar CSV» que usa `toCsv` con las columnas visibles.
- Permisos: la pestaña Ingresos solo se muestra a `owner`; la ruta `/reports` es accesible a todo staff (coaches ven las otras tres pestañas); si un coach fuerza la URL de ingresos, la vista muestra aviso y no llama a la API.
- `src/router/index.ts`: ruta `reports` hija de `AdminLayout` con `meta.requiresAuth` y `meta.title = 'Reportes'`. `admin-nav.ts`: entrada real «Reportes» (`pi pi-chart-bar`, grupo Análisis).
- Pruebas: pestañas por rol, cambio de rango recarga, exportación llama a `downloadCsv` con las columnas esperadas, `admin-nav` con rutas únicas.

### Fase final: Verificación y cierre (Tarea 009)

**009 - Documentación y verificación**
- `api/README.md`: contrato de las rutas, definiciones de tasas y matriz de permisos. `app/README.md`: sección Reportes y notas de CSV.
- `scripts/verify-api.sh` y `scripts/verify-app.sh` en verde; marcar la feature como completada.

---

## Impacto por Módulo

| Ruta | Cambio |
|------|--------|
| `api/src/lib/` | `reports-range.ts`, `reports-attendance.ts`, `reports-finance.ts` y sus `*.test.ts` |
| `api/src/hooks/` | `reports.ts` (compila a `pb_hooks/reports.pb.js`) |
| `api/pb_migrations/` | Sin cambios |
| `scripts/verify-api.sh` | Comprobaciones de permisos y validación |
| `app/package.json` | Dependencia `chart.js` |
| `app/src/lib/csv.ts` | Exportación CSV |
| `app/src/composables/useReports.ts` | Carga de reportes |
| `app/src/components/reports/` | `ReportChart.vue`, `buildChartData` |
| `app/src/views/admin/ReportsView.vue` | Vista con pestañas |
| `app/src/router/index.ts`, `app/src/layouts/admin-nav.ts` | Ruta y entrada de navegación |
| `api/README.md`, `app/README.md` | Documentación |

---

## Flujos Críticos

### Flujo 1: Owner consulta ingresos del mes y los exporta
```
1. Owner abre /reports, pestaña Ingresos, preset «Mes actual» → GET /api/admin/reports/revenue?from=2026-11-01&to=2026-11-30&group_by=week
2. El handler valida el rol, carga pagos con paid_at en [2026-11-01 00:00 NY, 2026-12-01 00:00 NY) y agrega con la librería
3. La vista pinta tarjetas, gráfico y tabla; «Exportar CSV» descarga jq-reportes-ingresos-2026-11-01_2026-11-30.csv con BOM
4. Resultado: Excel abre el archivo con acentos correctos y sin fórmulas ejecutables
```

### Flujo 2: Coach intenta ver ingresos
```
1. Coach abre /reports: solo ve Ocupación, Asistencia y Retención
2. Llama a GET /api/admin/reports/revenue con su token (o fuerza la pestaña por URL)
3. La API responde 403; la vista muestra el aviso sin llamar a la API
4. Resultado: no se filtra ningún dato financiero
```

### Flujo 3: Nombre de cliente o servicio con fórmula
```
1. Un nombre de servicio es «=HYPERLINK("http://x","clic")» y se exporta a CSV
2. toCsv lo prefija con ' y lo entrecomilla
3. Resultado: Excel lo muestra como texto, no lo evalúa
```

---

## Notas de Implementación

### Decisiones
- **Librería de gráficos: componente `Chart` de PrimeVue (Chart.js 4)**. Se elige porque ya está en el ecosistema de PrimeVue 5 (mismos tokens de tema y modo oscuro, sin otro sistema de diseño), Chart.js es MIT, cubre barras, líneas y anillos y tiene accesibilidad razonable con `aria-label`. Descartadas: ECharts (pesado, ~300 KB min+gzip), `vue-chartjs` (envoltura extra que duplica la de PrimeVue) y Unovis (menos integración con PrimeVue). Coste: `primevue/chart` importa `chart.js/auto` (~70 KB gzip), por eso se carga de forma diferida solo en `/reports`. La tarea 007 verifica que `primevue/chart` existe y sus props en la versión instalada antes de usarlo.
- **Agregación en el servidor, exportación en el cliente**: el servidor evita enviar registros crudos con datos personales; el CSV exporta lo que la vista ya muestra (agregados), sin segunda petición.
- **Librería pura separada de las rutas**: goja no comparte scope entre callbacks, y las pruebas con `bun test` no pueden levantar PocketBase.
- **Zona horaria con helper propio**: la agrupación por día/semana/mes y los límites del rango usan hora local de Miramar, FL; se evita `Intl` en goja.
- **Ingresos solo `owner`**: `reception` también queda fuera por el contrato (datos financieros), aunque sí pueda registrar pagos en 014. Decisión revisable.
- **Rango máximo 366 días** y `group_by=day` ≤ 92 días para acotar memoria y tiempo de respuesta en goja.

### Seguridad
- Rol comprobado en el servidor en cada ruta; la UI solo oculta.
- Parámetros validados con listas blancas; filtros de PocketBase construidos con parámetros enlazados (`{:from}`), nunca concatenando entrada del usuario.
- CSV protegido contra inyección de fórmulas; el prefijo `'` se aplica también a nombres de servicio, plan y coach.
- Las respuestas no incluyen nombres, correos ni teléfonos de clientes.
- Las consultas a `payments` y `memberships` se hacen en el servidor con acceso interno; no se relajan las reglas de esas colecciones.

### Referencias
- https://pocketbase.io/docs/js-routing/
- https://pocketbase.io/docs/js-database/
- https://primevue.org/chart/
- https://www.chartjs.org/docs/latest/
- https://owasp.org/www-community/attacks/CSV_Injection
- https://datatracker.ietf.org/doc/html/rfc4180

### Fuera de alcance
- Reportes de CRM, leads, marketing o seguimiento comercial.
- Reportes programados por correo, PDF, dashboards personalizables y comparación entre periodos (candidatos a feature futura).
- Reportes de coaching online (016) y de agenda personal (015).
- Previsión de ingresos y cohortes de retención por semana de alta.

---

## Criterios de Aceptación

- [x] `GET /api/admin/reports/occupancy|attendance|retention` responden con el contrato para staff activo y `403` o `401` sin sesión.
- [x] `GET /api/admin/reports/revenue` responde `200` solo a `owner`; `coach` y `reception` reciben `403`.
- [x] Los rangos se interpretan en hora de `America/New_York`, incluidos los días de cambio de horario; los parámetros inválidos devuelven `400`.
- [x] Las tasas no producen `NaN` ni `Infinity` con rangos vacíos; la suma de los grupos coincide con los totales.
- [x] `/reports` muestra cuatro pestañas para `owner` y tres para `coach`, con gráficos, tabla y filtros de rango y servicio.
- [x] «Exportar CSV» genera un archivo con BOM UTF-8, comillas y saltos de línea escapados y celdas con fórmulas neutralizadas.
- [x] `chart.js` se carga de forma diferida solo en la ruta `/reports`.
- [x] `bun test` (api) y `scripts/verify-api.sh` y `scripts/verify-app.sh` terminan en verde.

La verificación local ejecutó 85 pruebas de API, las comprobaciones con PocketBase y 302 pruebas de la app. El manifiesto de producción confirmó la importación diferida de Chart.js desde Reportes. En Edge se comprobó el flujo de owner y coach con una base temporal. LibreOffice Calc importó el CSV descargado con acentos y comillas correctos y mantuvo la fórmula de prueba como texto.

---

## Dependencias Entre Tareas

```
Feature 011/013/014 (contrato)  → 001, 004
001 (rango y zona horaria)      → 002, 003, 006
002 (ocupación y asistencia)    → 004
003 (ingresos y retención)      → 004
004 (rutas de reportes)         → 006, 008
005 (CSV)                       → 008
006 (useReports)                → 008
007 (ReportChart)               → 008
001-008                         → 009 (documentación y verificación)
```

---

## Validación Post-Deploy

1. `cd api && bun run build:ts && bun test` en verde; reiniciar PocketBase sin errores de carga de hooks.
2. Con token de owner: `curl -H "Authorization: $TOKEN" "$API/api/admin/reports/revenue?from=2026-11-01&to=2026-11-30"` → `200` con `totals.paid_cents`.
3. Con token de coach: la misma petición → `403`; `occupancy` → `200`.
4. `from=2026-11-30&to=2026-11-01` → `400`.
5. En la app como owner: abrir `/reports`, cambiar rango y exportar CSV; abrirlo en Excel y comprobar acentos y que una celda que empiece por `=` aparece como texto.
6. `scripts/verify-api.sh` y `scripts/verify-app.sh` → todas las comprobaciones en verde.

---

## Prompt y modelo utilizado

### Modelo

Sonnet 5.5

### Prompt

Contexto de la lista de características aprobada para esta feature: «017-reportes: rutas custom `GET /api/admin/reports/*` (staff/owner según dato financiero) con lib pura de agregación y pruebas: ocupación por clase y por servicio, asistencia y tasa de no-show, ingresos por plan/servicio/periodo, retención y bajas de membresías; filtros por rango de fechas en zona America/New_York; vista `/reports` con tabs, gráficos, exportación a CSV (escape correcto, BOM UTF-8 para Excel, protección contra inyección de fórmulas), permisos por rol (coaches no ven ingresos).»

```
Ok, con base en esta lista estructuremos los features que debemos implementar. Cada feature dejala plasmada en español en features/NNN-.../spec.md, crea las carpetas de ser necesario respetando el consecutivo, puedes usar features/spec-template.md como plantilla. Luego con base en ese spec crea las tareas granulares en features/NNN-.../tasks/NNN-....md, creando un consecutivo ordenado, tasks debidamente priorizadas teniendo en cuenta dependencias resueltas con anterioridad, puedes usar features/task-template.md como plantilla. Ten en cuenta la prelación entre unas y otras de manera de generar todo con la prioridad y orden adecuado.

(Descartado explícitamente el CRM/leads; comunicaciones solo propias del servicio.)
```
