# Especificación: Membresías y créditos

- **Estado:** Pendiente

## Resumen Ejecutivo

Este conjunto de 9 tareas añade las colecciones `memberships` y `credit_movements`, la lógica pura de ciclos de 4 semanas, compromiso de 16 semanas y saldo de créditos, y la UI para asignar un plan a un cliente y gestionarlo (renovar, pausar, reanudar, cancelar, ajustar créditos). Los créditos se descuentan solos cuando 011 marca una reserva como `attended` o `late_cancelled`, y la reserva sin créditos se bloquea salvo excepción del admin. No implementa cobros ni recibos (feature 014), ni agenda privada (015), ni coaching (016).

Entrega:

1. **Modelo de datos**: `memberships` (una por cliente y plan) y `credit_movements` (libro mayor inmutable; el saldo `credits_balance` es la suma de sus `delta`).
2. **Lógica pura** (`api/src/lib/membership-cycles.ts`, `api/src/lib/credits.ts`): fechas de periodos, compromiso, elegibilidad de reserva y deltas de crédito, con pruebas `bun test`.
3. **Rutas de gestión** (`/api/admin/memberships/...`): asignar, renovar, pausar, reanudar, cancelar, ajustar créditos; todas con transacción y auditoría.
4. **Enganche con reservas (011)**: consumo/pérdida automáticos y validación de reserva sin créditos (bloquea; override con `override_note`).
5. **Cron diario**: expira créditos sobrantes al cierre de cada periodo y pasa a `expired` las membresías sin renovar tras la gracia.
6. **UI**: diálogo de asignación, acciones de membresía, pestaña Membresías en el perfil del cliente (saldo e historial), filtro por plan activo en la lista de clientes y vista `/memberships`.

Contrato que deja a las siguientes: 014 genera cobros a partir de los cambios en `memberships` (`periods_paid`, `current_period_*`); 015 reutiliza `checkBookingEligibility` para sesiones privadas; 016 enlaza `coaching_programs.membership`; 017 y 018 leen saldos, vencimientos y movimientos.

---

## Estado actual del repositorio (punto de partida)

| Elemento | Estado |
|----------|--------|
| `api/` | PocketBase con migraciones en `api/pb_migrations/` (última existente: `1795260843_created_admins.js`; las features 005-012 añaden más, usar un timestamp mayor que la última presente al implementar) y hooks TypeScript en `api/src/hooks/*.ts` que compilan a `api/pb_hooks/*.pb.js` con `bun run build:ts`; libs puras en `api/src/lib/*.ts` |
| `memberships`, `credit_movements` | No existen (esta feature los crea) |
| `plans`, `services` (008), `clients` (010), `bookings`, `class_sessions` (009/011), `audit_logs` y `audit-config.ts` (005) | No existen aún en disco; se usan solo por el contrato compartido |
| `app/src/layouts/admin-nav.ts` | Declara la navegación; las entradas reales las activan las features de módulo |
| Perfil de cliente y lista de clientes (010), diálogo de reserva (011) | No existen aún; se amplían según el contrato (verificar nombres reales de archivo al implementar) |
| Datos | Sin datos previos; la migración no necesita backfill |

> Verificación obligatoria previa: la tarea 001 debe comprobar contra la versión de PocketBase instalada en `api/` que (a) existen los filtros por back-relation (`memberships_via_client`) y (b) `$app.runInTransaction` está disponible en goja; la tarea 005 debe comprobar qué ofrecen `e.record.original()` y los hooks `onRecordAfterUpdateSuccess` para elegir el enganche.

---

## Contrato de rutas

Todas bajo `/api/admin/memberships`, protegidas con el middleware de roles de 005. Escritura: `owner` y `reception`; el `coach` solo lee (por las reglas de colección). Errores en español con `code` estable.

| Método | Ruta | Cuerpo | Descripción |
|--------|------|--------|-------------|
| `POST` | `/assign` | `client`, `plan`, `starts_on` (opcional, hoy local), `notes` | Crea la membresía y otorga los créditos del primer periodo |
| `POST` | `/:id/renew` | `notes` (opcional) | Inicia el siguiente periodo y otorga créditos |
| `POST` | `/:id/pause` | `note` (obligatoria) | Pasa a `paused` congelando el periodo |
| `POST` | `/:id/resume` | - | Vuelve a `active` y desplaza `current_period_end` los días pausados |
| `POST` | `/:id/cancel` | `note` (obligatoria) | Pasa a `cancelled` y fija `ended_on` = hoy local; expira créditos; marca cancelación anticipada si hay compromiso vigente |
| `POST` | `/:id/adjust` | `delta` (entero ≠ 0), `note` (obligatoria) | Ajuste manual de créditos |
| `GET` | `/eligibility` | query `client`, `session` | Resultado de `checkBookingEligibility` para precomprobar una reserva en la UI |

Respuesta correcta: `200` con la membresía actualizada (y el movimiento creado cuando aplica). Errores comunes: `400` datos inválidos, `403` rol insuficiente, `404` no existe, `409` estado no permite la acción (p. ej. renovar una `cancelled`) o plan duplicado activo.

---

## Modelo de datos

### Colección `memberships` (base)

| Campo | Tipo | Reglas | Descripción |
|-------|------|--------|-------------|
| `client` | relation→clients | required | Cliente titular |
| `plan` | relation→plans | required | Plan contratado |
| `status` | select | `active`, `paused`, `expired`, `cancelled`; required | Estado |
| `starts_on` | date | required | Inicio (fecha local del negocio) |
| `current_period_start` | date | required | Inicio del periodo vigente |
| `current_period_end` | date | required | Último día (inclusive) del periodo vigente |
| `periods_paid` | number | min 0 | Periodos otorgados hasta hoy (el nombre es el del contrato; ver Decisiones) |
| `commitment_periods_total` | number | min 0 | Copia de `plans.commitment_periods` al asignar (0 = sin compromiso) |
| `credits_balance` | number | entero, puede ser negativo | Caché de la suma de `credit_movements.delta` |
| `auto_renew` | bool | por defecto `false` | Siempre `false` hasta existir pasarela |
| `paused_at` | date | opcional | Extensión: fecha de inicio de la pausa |
| `notes` | text | opcional | Extensión: motivo de pausa/cancelación y observaciones |
| `ended_on` | date | opcional | Fecha local (`YYYY-MM-DD`) de la baja: la fija el sistema al pasar a `cancelled` (día de la cancelación) o `expired` (día en que el cron la expira) y se vacía si una `expired` se renueva; la usan los reportes de retención (017) |

- **Índices:** `(client, status)` y `(current_period_end)` para consultas y cron; único parcial `(client, plan)` donde `status IN ('active','paused')` (no dos membresías vivas del mismo plan).
- **Reglas de API:** `listRule`/`viewRule` = staff; `createRule`/`updateRule`/`deleteRule` = `null` (solo rutas y hooks). `credits_balance` solo lo escribe el servicio.
- **Relaciones y borrado:** `client` y `plan` sin `cascadeDelete` (no se borra un cliente o plan con membresías; se desactivan).

### Colección `credit_movements` (base)

| Campo | Tipo | Reglas | Descripción |
|-------|------|--------|-------------|
| `membership` | relation→memberships | required | Membresía afectada |
| `booking` | relation→bookings | opcional | Reserva que originó el movimiento |
| `delta` | number | entero ≠ 0 | Positivo = otorga, negativo = consume/pierde/expira |
| `reason` | select | `grant`, `attend`, `late_cancel`, `adjust`, `expire` | Motivo |
| `note` | text | obligatoria si `reason = adjust` | Explicación |
| `created` | autodate | - | Fecha del movimiento |
| `created_by` | relation→admins | opcional | Extensión: quién lo originó (vacío si fue automático) |

- **Reglas de API:** `listRule`/`viewRule` = staff; escritura `null`. Los movimientos no se editan ni se borran: se corrigen con otro movimiento `adjust`.
- **Índice:** `(membership, created)` y `(booking)`.

### Máquina de estados de `memberships`

```
active ⇄ paused
active → expired       (cron: gracia agotada sin renovar)
expired → active       (renovación manual tras vencer)
active | paused | expired → cancelled   (final)
```

---

## Reglas de dominio

**Ciclos.** Un periodo dura 28 días: `current_period_end = current_period_start + 27`. El siguiente periodo empieza el día `end + 1`. Todas las fechas son fechas locales (`YYYY-MM-DD`, zona `America/New_York`); la lib opera con aritmética de días UTC sobre esas cadenas, sin `Intl`.

**Compromiso.** Si `commitment_periods_total > 0` (típico 4 = 16 semanas) el compromiso termina al final del periodo `commitment_periods_total`. Cancelar antes es "cancelación anticipada": se permite (decide el admin) pero queda marcada en `notes` y en `audit_logs`. Tras el compromiso la membresía sigue renovándose periodo a periodo.

**Créditos por tipo de plan.**

| Plan | Créditos al otorgar | Límite adicional |
|------|--------------------|------------------|
| `per_4_weeks`, `sessions > 0` | `sessions` por periodo | `per_week > 0`: máximo de reservas por semana local (lunes a domingo) |
| `per_4_weeks`, `sessions = 0` | Ilimitado (no usa créditos) | `per_week > 0`: máximo semanal; si también es 0, sin límite |
| `per_class` (clase suelta) | 1 por compra; vigencia = 1 periodo | Se renueva comprando otra |
| `first_visit` (`is_first_class`) | 1 | Solo si `clients.free_class_used = false` y el cliente no tiene otra membresía `first_visit`; se marca `free_class_used = true` al asistir |

**Movimientos.** `grant` al asignar/renovar. `attend` (-1) cuando la reserva pasa a `attended`; `late_cancel` (-1) cuando pasa a `late_cancelled` o `no_show` (decisión: el `no_show` se trata como cancelación tardía y su nota lo indica). Si una reserva cobrada vuelve a un estado no cobrado (corrección del admin) se registra `adjust` +1. El enganche es idempotente: calcula la diferencia entre lo que corresponde cobrar y lo ya registrado para esa reserva. `expire` (-saldo) cuando termina el periodo con saldo positivo (sin arrastre). `adjust` es manual, con nota.

**Validación de reserva sin créditos (decisión).** Bloquear por defecto. Disponible = `credits_balance` menos las reservas `booked` futuras del cliente dentro del periodo (créditos ya comprometidos). Si disponible ≤ 0, o el cliente no tiene membresía `active` cuyo plan cubra el servicio, o supera `per_week`, la creación de la reserva se rechaza con `code: no_credits`. El admin puede forzarla enviando `override_note` no vacía (campo ya existente en `bookings`); el saldo puede quedar negativo y se refleja en la UI. Aplica a sesiones `regular` y `private` de servicios `group` y `personal`; las `special` no consumen créditos. La lista de espera se valida al entrar, no al promocionarse.

**Renovación pendiente.** Estado derivado (no es un `status`): `active` con `hoy > current_period_end`. Tras `GRACE_DAYS = 7` días el cron la pasa a `expired` y fija `ended_on`. La renovación es manual: si ocurre dentro de la gracia el nuevo periodo empieza en `end + 1`; si ya expiró, empieza hoy.

---

## Arquitectura de Cambios

### Fase 1: Modelo de datos (Tarea 001)

**001 - Migración de `memberships` y `credit_movements`**
- `api/pb_migrations/<timestamp>_created_memberships.js` y `<timestamp+1>_created_credit_movements.js` con `up` y `down`, índices y reglas descritas.
- Comprobación previa de back-relations y transacciones en la versión instalada.

### Fase 2: Lógica pura (Tareas 002-003)

**002 - Lib de ciclos y compromiso**
- `api/src/lib/membership-cycles.ts`: `addDays`, `periodBounds(startsOn, index)`, `nextPeriod(end)`, `commitmentEnd`, `commitmentState(m, today)`, `isRenewalPending`, `shouldExpire(m, today, GRACE_DAYS)`, `extendByPause`.

**003 - Lib de créditos y reglas por plan**
- `api/src/lib/credits.ts`: `creditsToGrant(plan)`, `creditsToApply(bookingStatus, alreadyApplied)`, `reasonFor(status)`, `computeBalance(movements)`, `checkBookingEligibility(input)` (membresía, plan, reservas, semana local) y `requiresCredit(session, service)`.

### Fase 3: Servidor (Tareas 004-006)

**004 - Rutas de gestión de membresías**
- `api/src/lib/memberships-service.ts` (funciones con `app` inyectado, sin globals) y `api/src/hooks/memberships.ts` con las rutas del contrato, en transacción; registra `memberships` y `credit_movements` en `audit-config.ts`.

**005 - Enganche con reservas y validación**
- `api/src/hooks/membership-bookings.ts`: reconciliación tras guardar `bookings` (estados `attended`, `late_cancelled`, `no_show`), validación en `onRecordCreateRequest`/`onRecordUpdateRequest` y ruta `GET /eligibility`.

**006 - Cron de expiración y renovación pendiente**
- `api/src/hooks/memberships-cron.ts` con `cronAdd("memberships_daily", ...)` y ruta manual para el owner `POST /api/admin/memberships/run-daily` útil en pruebas.

### Fase 4: Interfaz (Tareas 007-008)

**007 - Composable y componentes**
- `app/src/composables/useMemberships.ts`; componentes `MembershipStatusTag`, `AssignPlanDialog`, `MembershipActions`, `CreditLedger`, `CreditAdjustDialog`, `CreditOverrideDialog`. Pruebas Vitest del composable.

**008 - Vistas, rutas y navegación**
- Pestaña Membresías en el perfil del cliente (010), filtro por plan activo en la lista de clientes, `MembershipsView` en `/memberships`, entrada real en `admin-nav.ts`, integración de `CreditOverrideDialog` en el diálogo de reserva de 011.

### Fase final: Verificación y cierre (Tarea 009)

**009 - Documentación y verificación**
- Sección en `api/README.md` y `app/README.md`, ampliación de `scripts/verify-api.sh` y verificación completa.

---

## Impacto por Módulo

| Ruta | Cambio |
|------|--------|
| `api/pb_migrations/` | Dos migraciones nuevas |
| `api/src/lib/` | `membership-cycles.ts`, `credits.ts`, `memberships-service.ts`, `audit-config.ts` (añade colecciones) y sus pruebas |
| `api/src/hooks/` | `memberships.ts`, `membership-bookings.ts`, `memberships-cron.ts` |
| `app/src/composables/`, `components/` | `useMemberships`, componentes de membresía |
| `app/src/views/admin/` | `MembershipsView.vue`; ampliación de perfil y lista de clientes (010) |
| `app/src/router/index.ts`, `layouts/admin-nav.ts` | Ruta y entrada `/memberships` |
| `api/README.md`, `app/README.md`, `scripts/` | Documentación y verificación |

---

## Flujos Críticos

### Flujo 1: Asignar plan y reservar
```
1. Reception asigna el plan "12 sesiones / 4 semanas" a un cliente → membresía active, +12 grant
2. Reserva una clase → eligibility ok, reserva booked (sin movimiento)
3. Coach marca attended → hook registra attend -1
4. Resultado: saldo 11 y movimiento enlazado a la reserva
```

### Flujo 2: Reserva sin créditos
```
1. Cliente con saldo 0 intenta reservar → 400 no_credits
2. Reception confirma el diálogo de excepción con nota → reserva con override_note
3. Resultado: reserva creada; al asistir el saldo queda en -1 y se muestra como deuda de créditos
```

### Flujo 3: Cancelación tardía y corrección
```
1. Reserva pasa a late_cancelled → late_cancel -1
2. Admin corrige a cancelled → el hook calcula diferencia y registra adjust +1
3. Resultado: saldo restaurado, rastro completo en el historial
```

### Flujo 4: Fin de periodo
```
1. El cron detecta current_period_end < hoy → expire por el saldo positivo
2. Pasada la gracia sin renovar → status expired
3. Resultado: /memberships lo muestra como "Renovación pendiente" y luego "Vencida"
```

---

## Notas de Implementación

### Decisiones
- **Bloquear con override** (no permitir por defecto): evita saldo negativo silencioso; el override queda auditado con nota. Alternativa descartada: permitir siempre y solo avisar.
- **El saldo es suma de movimientos**; `credits_balance` es caché actualizada en la misma transacción. Alternativa descartada: calcular siempre sobre la marcha (lento en listas).
- **Consumo al asistir, no al reservar**: simplifica cancelaciones; los créditos comprometidos por reservas futuras se descuentan solo en la validación.
- **`no_show` = pérdida** (`late_cancel`): el contrato no define motivo para ausencias.
- **`periods_paid` cuenta periodos otorgados**, no pagados; el pago real vive en 014.
- **Campos extra sobre el contrato** (`paused_at`, `notes`, `ended_on` en `memberships`; `created_by` en `credit_movements`): necesarios para pausas, motivos y trazabilidad. Revisar.
- **Servicios con `app` inyectado** (`*-service.ts`): goja no comparte scope y las rutas necesitan lógica reutilizable (015 y 014); no leen globals.

### Migraciones
- Archivos en `api/pb_migrations/` con `migrate((app) => {...}, (app) => {...})`; timestamp mayor que el de la última migración presente; `down` borra solo lo creado.

### Convención de código
- Libs puras en `api/src/lib/*.ts` (sin `$app`); los hooks hacen `require(`${__hooks}/lib/<x>`)` dentro de cada callback.
- Fechas como cadenas `YYYY-MM-DD` locales; conversión desde `starts_at` UTC con el helper de hora local de 009.
- UI: PrimeVue 5, textos en español, ruta y entrada de nav reales.

### Seguridad
- Reglas de colección cerradas (`null` para escritura); rutas con control de rol; ajuste y cancelación exigen nota; todo auditado (`audit_logs`).

### Fuera de alcance
- Cobros, recibos y pasarela (014); `auto_renew` real; reservas privadas y especiales (015); coaching (016); reportes (017); avisos al cliente (018).

---

## Criterios de Aceptación

- [ ] Asignar un plan crea la membresía con fechas de periodo correctas y los créditos del plan; no permite dos activas del mismo plan.
- [ ] Marcar `attended` o `late_cancelled` crea el movimiento una sola vez; cambiar de estado ajusta la diferencia.
- [ ] Reservar sin créditos devuelve `no_credits`; con `override_note` se permite y el saldo puede ser negativo.
- [ ] Renovar, pausar, reanudar, cancelar y ajustar funcionan y exigen nota donde corresponde; roles sin permiso reciben `403`.
- [ ] El cron expira créditos al cierre del periodo y pasa a `expired` tras la gracia.
- [ ] La pestaña Membresías muestra saldo e historial; la lista de clientes filtra por plan activo; `/memberships` lista y filtra por estado.
- [ ] Las lógicas puras tienen pruebas `bun test` y los componentes pruebas Vitest.
- [ ] `scripts/verify-api.sh` y `scripts/verify-app.sh` terminan en verde.

---

## Dependencias Entre Tareas

```
Feature 008, 010, 011 (contrato) → 001
001 (migración)                  → 004, 005, 006
002 (lib ciclos)                 → 003, 004, 006
003 (lib créditos)               → 004, 005
004 (rutas)                      → 005, 006, 007
005 (enganche reservas)          → 008
007 (composable y componentes)   → 008
006, 008                         → 009 (documentación y verificación)
```

---

## Validación Post-Deploy

1. `scripts/verify-api.sh` y `scripts/verify-app.sh` en verde; las migraciones se aplican sin errores.
2. Asignar un plan desde el perfil de un cliente: aparece la membresía con saldo esperado.
3. Marcar una reserva como asistida: el historial muestra `attend` -1.
4. Intentar reservar con saldo 0: aparece el diálogo de excepción; sin nota no se permite.
5. Ejecutar `run-daily` con una membresía vencida: los créditos expiran y el estado cambia tras la gracia.

---

## Prompt y modelo utilizado

### Modelo

Sonnet 5.5

### Contexto: lista de características aprobada

Esta feature sale de la lista de características aprobada por el usuario (el CRM/leads quedó descartado explícitamente). Alcance aprobado para esta feature:

> `memberships` y `credit_movements`; lib pura de ciclos de 4 semanas y compromiso de 16 semanas (4 periodos), saldo de créditos (consumo al asistir, pérdida en cancelación tardía, ajuste manual con nota, expiración), reglas por tipo de plan (`sessions`, `per_week`, clase suelta, primera clase), enganche a los eventos de 011 (attended / late_cancelled), validación de reserva sin créditos, cron de expiración/renovación pendiente, UI: asignar plan a cliente, pausar/cancelar/renovar manualmente, pestaña Membresías en el perfil del cliente (010) con saldo e historial de movimientos, filtros por plan activo en la lista de clientes, lista `/memberships`.

### Prompt

```
Ok, con base en esta lista estructuremos los features que debemos implementar. Cada feature dejala plasmada en español en features/NNN-.../spec.md, crea las carpetas de ser necesario respetando el consecutivo, puedes usar features/spec-template.md como plantilla. Luego con base en ese spec crea las tareas granulares en features/NNN-.../tasks/NNN-....md, creando un consecutivo ordenado, tasks debidamente priorizadas teniendo en cuenta dependencias resueltas con anterioridad, puedes usar features/task-template.md como plantilla. Ten en cuenta la prelación entre unas y otras de manera de generar todo con la prioridad y orden adecuado.
```
