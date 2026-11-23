# Especificación: Pagos y recibos

- **Estado:** Completado

## Resumen Ejecutivo

Este conjunto de 9 tareas añade la colección `payments` y una numeración de recibos `JQ-AAAA-NNNNNN` sin huecos ni duplicados, el registro manual de cobros (efectivo, Zelle, tarjeta, otro), la anulación auditada, la generación automática de cobros pendientes por cada ciclo de membresía, la ruta de cobros por vencer, la vista `/payments` y un recibo imprimible en HTML. No implementa pasarela de pago ni conciliación bancaria: todo cobro se registra a mano; solo se documenta el punto de extensión.

Entrega:

1. **Modelo de datos**: `payments` y una colección interna `receipt_sequences` (un contador por año) que garantiza la secuencia.
2. **Lógica pura**: formato y validación del número de recibo, y clasificación de vencimientos y alertas de renovación (`api/src/lib/receipt-number.ts`, `api/src/lib/payments-due.ts`).
3. **Rutas de cobro**: registrar, marcar pagado y anular, todas en transacción con auditoría.
4. **Cobros por ciclo**: un hook sobre `memberships` (013) crea el cobro `pending` de cada periodo, sin duplicados.
5. **Ruta `GET /api/admin/payments/due`**: vencidos, por vencer y alertas de renovación.
6. **UI**: vista `/payments` con filtros, recibo imprimible, pestaña Pagos en el perfil del cliente y tarjeta "cobros por vencer" activa en el dashboard.

Contrato que deja a las siguientes: 017 lee `payments` para ingresos y cobranza; 018 usa `GET /payments/due` y los cobros `pending` para avisos `payment_due` y `membership_renewal`; una futura pasarela llamará a `settlePayment`.

---

## Estado actual del repositorio (punto de partida)

| Elemento | Estado |
|----------|--------|
| `api/` | PocketBase; migraciones JS en `api/pb_migrations/` (última existente: `1795264702_linked_booking_membership.js`; usar timestamp mayor que el de la última presente); hooks y libs TypeScript compilados con `bun run build:ts` |
| `payments`, `receipt_sequences` | No existen (esta feature los crea) |
| `memberships`, `plans`, `clients` | Ya existen en las migraciones de 013, 008 y 010 |
| `audit-config.ts`, middleware de roles (005) | Disponible en las librerías de API |
| Dashboard (012) y perfil del cliente (010) | Disponibles en `DashboardView.vue` y `ClientDetailView.vue` |
| `app/src/lib/` | Sin datos del negocio para el recibo; se crea `business.ts` |

> Verificación obligatoria previa: la tarea 001 debe confirmar que `$app.runInTransaction` serializa las escrituras en SQLite (dos peticiones simultáneas no obtienen el mismo número) y que los índices únicos parciales (`WHERE receipt_number != ''`) están soportados en la versión instalada.

---

## Contrato de rutas

Bajo `/api/admin/payments`, solo roles `owner` y `reception` (el `coach` no accede a pagos).

| Método | Ruta | Cuerpo / query | Descripción |
|--------|------|----------------|-------------|
| `POST` | `/` | `client`, `amount_cents`, `method`, `status` (`paid`\|`pending`), `membership`, `plan`, `due_on`, `paid_at`, `note` | Registro manual |
| `POST` | `/:id/pay` | `method`, `paid_at` (opcional), `note` | Marca un `pending` como pagado y asigna recibo |
| `POST` | `/:id/void` | `reason` (obligatoria) | Anula sin borrar |
| `GET` | `/due` | `days` (por defecto 7), `limit` | Cobros vencidos, por vencer y alertas de renovación |

`GET /due` responde:

```json
{
  "today": "2026-11-21",
  "overdue": [{ "id": "", "client": { "id": "", "name": "" }, "amount_cents": 0, "due_on": "", "days_overdue": 0, "plan": "" }],
  "upcoming": [{ "id": "", "client": {}, "amount_cents": 0, "due_on": "", "days_until": 0 }],
  "renewals": [{ "membership": "", "client": {}, "plan": "", "period_end": "", "state": "ending_soon|lapsed", "has_pending_payment": false }],
  "totals": { "overdue_cents": 0, "upcoming_cents": 0, "overdue_count": 0, "upcoming_count": 0, "renewals_count": 0 }
}
```

Errores: `400` datos inválidos (monto ≤ 0, método desconocido, sin motivo al anular), `403` rol, `404` no existe, `409` transición no válida (pagar un `void`, anular un `void`, pagar un `paid`).

---

## Modelo de datos

### Colección `payments` (base)

| Campo | Tipo | Reglas | Descripción |
|-------|------|--------|-------------|
| `client` | relation→clients | required | Cliente que paga |
| `membership` | relation→memberships | opcional | Membresía asociada |
| `plan` | relation→plans | opcional | Plan facturado |
| `amount_cents` | number | entero > 0 | Monto en centavos USD |
| `method` | select | `cash`, `zelle`, `card`, `other` | Obligatorio al pasar a `paid` |
| `status` | select | `pending`, `paid`, `void`; required | Estado |
| `due_on` | date | opcional | Fecha límite local |
| `paid_at` | date | requerido si `paid` | Fecha de pago |
| `receipt_number` | text | único cuando no vacío | `JQ-AAAA-NNNNNN`; vacío mientras `pending` |
| `note` | text | opcional | Observaciones |
| `recorded_by` | relation→admins | required | Quién registró |
| `period_index` | number | opcional | Extensión: periodo de la membresía que cubre (para no duplicar cobros) |
| `void_reason` | text | requerido si `void` | Extensión |
| `voided_at` | date | requerido si `void` | Extensión |
| `voided_by` | relation→admins | requerido si `void` | Extensión |

- **Índices:** único parcial `receipt_number` donde `receipt_number != ''`; único parcial `(membership, period_index)` donde `membership != '' AND status != 'void'`; consulta `(status, due_on)` y `(client)`.
- **Reglas de API:** `listRule`/`viewRule` = staff con `role != "coach"`; `createRule`/`updateRule`/`deleteRule` = `null` (solo rutas). No se borra ningún pago nunca.
- **Relaciones:** sin `cascadeDelete`.

### Colección `receipt_sequences` (base, interna)

| Campo | Tipo | Reglas | Descripción |
|-------|------|--------|-------------|
| `year` | number | único | Año local del recibo |
| `last_seq` | number | entero ≥ 0 | Último número emitido |

- Reglas de API: todas `null` (solo servicio). Extensión sobre el contrato, necesaria para la secuencia.

### Máquina de estados

```
pending → paid → void
pending → void
```

Un pago `void` conserva su `receipt_number` (el hueco no existe: el número queda ocupado y visible como anulado). Un `pending` no tiene número hasta pagarse.

---

## Reglas de dominio

- **Número de recibo.** `JQ-<año local de paid_at>-<seq a 6 dígitos>`. Se asigna dentro de la transacción que pasa el pago a `paid`: lee o crea la fila de `receipt_sequences` del año, incrementa `last_seq` y guarda el pago. Si algo falla, todo se revierte y no se consume número. La secuencia reinicia cada año.
- **Cobros por ciclo.** Un hook sobre `memberships` (013) llama a `ensurePendingCharge`: por cada periodo otorgado (`periods_paid`, desde 1) crea un `payments` `pending` con `amount_cents = plans.price_cents` y `due_on = current_period_start`; no crea nada si el precio es 0 (primera clase), si el periodo ya tiene cobro no anulado, o si la membresía está `cancelled`. Planes `per_class` generan un único cobro.
- **Vencimientos.** `pending` con `due_on < hoy` es vencido; con `due_on` en los próximos `days` es por vencer. La mora no bloquea la membresía ni las reservas (decisión).
- **Alertas de renovación.** Membresías `active` cuyo `current_period_end` cae dentro de `days` (`ending_soon`) o ya pasó sin renovar (`lapsed`), con indicador de si tienen un cobro `pending` del siguiente periodo.
- **Anulación.** Solo con motivo; conserva el registro, el recibo y los datos originales; auditada. Anular un cobro de ciclo permite que el hook cree uno nuevo para el mismo periodo.

---

## Arquitectura de Cambios

### Fase 1: Modelo de datos (Tarea 001)

**001 - Migración de `payments` y `receipt_sequences`**
- Dos migraciones con `up`/`down`, índices únicos parciales y reglas cerradas.

### Fase 2: Lógica pura (Tareas 002-003)

**002 - Lib del número de recibo**
- `api/src/lib/receipt-number.ts`: `formatReceipt(year, seq)`, `parseReceipt(text)`, `isValidReceipt`, `nextSequence(lastSeq)` y `localYear(date)`.

**003 - Lib de vencimientos y alertas de renovación**
- `api/src/lib/payments-due.ts`: `classifyDue(dueOn, today, windowDays)`, `buildDueReport(payments, memberships, today, days)`, `chargeForPeriod(plan, membership)`.

### Fase 3: Servidor (Tareas 004-005)

**004 - Servicio y rutas de pagos**
- `api/src/lib/payments-service.ts` (con `app` inyectado): `createPayment`, `settlePayment`, `voidPayment`, `issueReceipt`; rutas `POST /`, `/:id/pay`, `/:id/void`; auditoría y registro de `payments` en `audit-config.ts`.

**005 - Cobros por ciclo y ruta `due`**
- `api/src/hooks/payments-charges.ts`: hooks de `memberships` y `GET /api/admin/payments/due`.

### Fase 4: Interfaz (Tareas 006-008)

**006 - Composables y componentes**
- `usePayments`, `usePaymentsDue`, `PaymentStatusTag`, `PaymentFormDialog`, `VoidPaymentDialog`, `lib/money.ts`.

**007 - Vista `/payments` y recibo imprimible**
- `PaymentsView.vue`, `ReceiptView.vue` (`/receipts/:id`, sin layout) y `lib/business.ts`; ruta y entrada de navegación.

**008 - Pestaña Pagos y dashboard**
- Pestaña "Pagos" en el perfil del cliente (010) y activación de "cobros por vencer" en el dashboard (012).

### Fase final: Verificación y cierre (Tarea 009)

**009 - Documentación y verificación**
- READMEs, punto de extensión de la pasarela y scripts de verificación.

---

## Impacto por Módulo

| Ruta | Cambio |
|------|--------|
| `api/pb_migrations/` | Migraciones de `payments` y `receipt_sequences` |
| `api/src/lib/` | `receipt-number.ts`, `payments-due.ts`, `payments-service.ts`, `audit-config.ts` |
| `api/src/hooks/` | `payments.ts` (rutas de cobro) y `payments-charges.ts` |
| `app/src/composables/`, `components/payments/` | `usePayments`, `usePaymentsDue` y componentes |
| `app/src/views/admin/` | `PaymentsView.vue`, `ReceiptView.vue`; perfil de cliente (010) y dashboard (012) ampliados |
| `app/src/lib/` | `money.ts`, `business.ts` |
| `app/src/router/index.ts`, `layouts/admin-nav.ts` | `/payments` y `/receipts/:id` |
| `app/src/styles/` | Estilos `@media print` del recibo |
| `api/README.md`, `app/README.md`, `scripts/` | Documentación y verificación |

---

## Flujos Críticos

### Flujo 1: Cobro de un ciclo
```
1. 013 renueva la membresía → el hook crea un pago pending (precio del plan, due_on = inicio del periodo)
2. Reception abre /payments, pulsa "Registrar pago" y elige Zelle
3. La ruta /pay asigna JQ-2026-000042 en transacción y pasa a paid
4. Resultado: recibo imprimible disponible; el cobro sale de vencidos/por vencer
```

### Flujo 2: Dos cobros simultáneos
```
1. Dos peticiones /pay llegan a la vez
2. Las transacciones se serializan: cada una incrementa receipt_sequences
3. Resultado: números consecutivos distintos; el índice único impide cualquier duplicado
```

### Flujo 3: Anulación
```
1. El owner anula un pago paid con motivo "Cobro duplicado"
2. status = void, se guardan motivo, fecha y autor; el recibo conserva su número
3. Resultado: no cuenta en ingresos; audit_logs registra la anulación; sin motivo → 400
```

---

## Notas de Implementación

### Decisiones
- **Número al pagar, no al crear**: los pendientes no consumen secuencia, así que no hay huecos por cobros nunca cobrados. Alternativa descartada: numerar al crear y anular los no cobrados.
- **Contador en colección (`receipt_sequences`)** en lugar de `MAX(receipt_number)+1`: es explícito, auditable y rápido; con el índice único como red de seguridad.
- **La mora no bloquea** reservas ni la membresía; la gestión es del staff mediante alertas.
- **Campos extra sobre el contrato** (`period_index`, `void_reason`, `voided_at`, `voided_by` en `payments`; `receipt_sequences`): necesarios para idempotencia, anulación auditada y secuencia. Revisar.
- **Recibo HTML con `window.print()`** y estilos `@media print`: sin dependencia de PDF.
- **Regla de colección** `role != "coach"` para pagos: el contrato solo define staff y owner; los pagos son datos financieros.

### Punto de extensión de la pasarela (fuera de alcance)
- Toda confirmación de cobro pasa por `settlePayment(app, paymentId, { method, paidAt, recordedBy, externalRef? })`. Una pasarela futura (Stripe, Square, etc.) añadiría `provider`/`external_ref` a `payments`, una ruta de webhook que verifique la firma y llame a `settlePayment`, y `auto_renew` en 013. No se implementa nada de esto ahora.

### Migraciones
- `api/pb_migrations/<timestamp>_created_payments.js` y `..._created_receipt_sequences.js` con `up`/`down`; timestamp mayor que el de la última presente.

### Convención de código
- Libs puras sin `$app`; el servicio con DB recibe `app`; en hooks se hace `require(`${__hooks}/lib/<x>`)` dentro de cada callback.
- Dinero en centavos; formato con `Intl.NumberFormat` solo en `app/src/lib/money.ts`.

### Seguridad
- Escritura solo por rutas con rol; nada se borra; anulación con motivo y autoría; el coach no ve pagos; auditoría de cada operación.

### Fuera de alcance
- Pasarela, conciliación bancaria, reembolsos parciales, facturas fiscales y PDF (queda "Después"); reportes de ingresos (017); recordatorios de pago por correo (018).

---

## Criterios de Aceptación

- [x] Pagar un cobro asigna `JQ-AAAA-NNNNNN` consecutivo; los pendientes no tienen número.
- [x] Dos pagos simultáneos obtienen números distintos y consecutivos; un fallo no consume número.
- [x] Anular exige motivo, no borra y conserva el recibo; transiciones inválidas devuelven `409`.
- [x] Renovar una membresía crea un único cobro `pending` por periodo; repetir el hook no duplica.
- [x] `GET /api/admin/payments/due` clasifica vencidos, por vencer y renovaciones y devuelve totales.
- [x] `/payments` filtra por estado, método, cliente, rango y vencidos; el recibo se imprime sin menú ni botones.
- [x] El perfil del cliente muestra la pestaña Pagos y el dashboard muestra los cobros por vencer reales.
- [x] `scripts/verify-api.sh` y `scripts/verify-app.sh` terminan en verde.

---

## Dependencias Entre Tareas

```
Feature 013 (contrato)       → 001, 005
001 (migración)              → 004, 005
002 (lib recibo)             → 004
003 (lib vencimientos)       → 005
004 (servicio y rutas)       → 005, 006
006 (composables)            → 007, 008
005, 007                     → 008
005, 008                     → 009 (documentación y verificación)
```

---

## Validación Post-Deploy

1. `scripts/verify-api.sh` y `scripts/verify-app.sh` en verde.
2. Renovar una membresía: aparece un cobro pendiente en `/payments`.
3. Registrar el pago: se emite `JQ-AAAA-NNNNNN` y el recibo se imprime correctamente (vista previa de impresión).
4. Anular sin motivo: error; con motivo: estado `void` y fila en auditoría.
5. `GET /api/admin/payments/due?days=7` con sesión reception: lista coherente; con sesión coach: `403`.

---

## Prompt y modelo utilizado

### Modelo

Sonnet 5.5

### Contexto: lista de características aprobada

Esta feature sale de la lista de características aprobada por el usuario (el CRM/leads quedó descartado explícitamente). Alcance aprobado para esta feature:

> `payments` con secuencia de recibo `JQ-AAAA-NNNNNN` sin huecos ni duplicados, registro manual (efectivo/Zelle/tarjeta/otro), estados pending/paid/void (anular sin borrar, con motivo y auditoría), cobros pendientes y vencidos generados por ciclo de membresía, alertas de renovación, ruta `GET /api/admin/payments/due`, vista `/payments` con filtros, recibo imprimible (HTML con estilos print, sin PDF), activar "cobros por vencer" en el dashboard, pestaña Pagos en el perfil del cliente. Pasarela de pago fuera de alcance.

### Prompt

```
Ok, con base en esta lista estructuremos los features que debemos implementar. Cada feature dejala plasmada en español en features/NNN-.../spec.md, crea las carpetas de ser necesario respetando el consecutivo, puedes usar features/spec-template.md como plantilla. Luego con base en ese spec crea las tareas granulares en features/NNN-.../tasks/NNN-....md, creando un consecutivo ordenado, tasks debidamente priorizadas teniendo en cuenta dependencias resueltas con anterioridad, puedes usar features/task-template.md como plantilla. Ten en cuenta la prelación entre unas y otras de manera de generar todo con la prioridad y orden adecuado.
```
