# Especificación: Agenda de Personal Training y sesiones especiales

- **Estado:** Completado

## Resumen Ejecutivo

Este conjunto de 8 tareas añade la disponibilidad semanal de cada coach (`coach_availability`), las sesiones privadas (`class_sessions.kind = private`, capacidad 1 o 2) y las sesiones especiales (`kind = special`, eventos o clases únicas) sobre las tablas de horarios de 009, con validación de choques de horario, una vista de agenda por coach (día/semana) y el alta de ambos tipos desde la UI. Las sesiones privadas se reservan con las reglas de 011 y consumen créditos según 013. No crea un calendario nuevo: reutiliza `class_sessions` y el calendario de 009.

Entrega:

1. **Disponibilidad por coach**: colección `coach_availability` y editor semanal.
2. **Reglas de agendado** (lib pura `api/src/lib/scheduling.ts`): solapes, contención en la disponibilidad, capacidad privada por plan partner.
3. **Validación en servidor**: hooks sobre `class_sessions` para `private` y `special`, y ruta transaccional para agendar una sesión privada con uno o dos clientes.
4. **Agenda por coach**: vista día/semana con sesiones, reservas y disponibilidad.
5. **Alta desde la UI**: diálogo de sesión privada y de clase especial (desde el calendario de 009).

Contrato que deja a las siguientes: 017 reporta ocupación y sesiones privadas; 019 puede publicar las sesiones `special` abiertas.

---

## Estado actual del repositorio (punto de partida)

| Elemento | Estado |
|----------|--------|
| `api/` | PocketBase; migraciones JS en `api/pb_migrations/` (última antes de la feature: `1795264801_created_payments.js`; usar timestamp mayor que el de la última presente); hooks y libs TypeScript compilados con `bun run build:ts` |
| `coach_availability` | No existe (esta feature la crea) |
| `class_sessions`, `schedule_blocks`, calendario (009); `bookings` (011); `memberships` y `checkEligibility` (013); `plans.partner` (008); coaches (007) | Implementados en las features 007 a 013 |
| Helper de hora local en servidor | `localToUtc` y `utcToLocal` de `api/src/lib/tz.ts` (009) |
| Datos | `class_sessions` puede tener sesiones `regular`; sus coaches cuentan para los choques |

> Verificación obligatoria previa: la tarea 001 debe confirmar cómo se almacenan `weekday` y `start_time` en 009 (0=domingo, `HH:mm` local) y el nombre del helper de conversión UTC↔local; 002 debe reutilizarlo en vez de duplicarlo.

---

## Contrato de rutas

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| `POST` | `/api/admin/sessions/private` | `owner`, `reception`, `coach` (solo para sí mismo) | Crea una sesión privada y las reservas de 1-2 clientes en una transacción |

El cuerpo incluye `service`, `coach`, `starts_at` (UTC ISO), `duration_min`, `client_ids` (1 o 2), y admite `notes` y `capacity` opcionales. Responde `200` con `{ session, bookings }`, `403` por rol, `409` ante un duplicado o `400` por datos inválidos, `coach_conflict`, `block_conflict`, `outside_availability`, `invalid_capacity`, `partner_required` o fallos de elegibilidad de 013. Owner y reception pueden enviar `overrides[client_id].override_note` por cliente. PocketBase expone los códigos en `data.code.code`.

La disponibilidad se gestiona con las reglas de la colección (sin ruta propia).

---

## Modelo de datos

### Colección `coach_availability` (base)

| Campo | Tipo | Reglas | Descripción |
|-------|------|--------|-------------|
| `coach` | relation→admins | required | Coach (rol `coach` u `owner`, activo) |
| `weekday` | number | entero 0-6 (0=domingo) | Día de la semana local |
| `start_time` | text | `HH:mm` | Inicio local |
| `end_time` | text | `HH:mm`, mayor que `start_time` | Fin local |

- **Índices:** `(coach, weekday)`.
- **Reglas de API:** `listRule`/`viewRule` = staff; `createRule`/`updateRule`/`deleteRule` = owner o el propio coach (`coach = @request.auth.id`).
- **Validación (hook):** los tramos de un mismo coach y día no se solapan; formato de hora y orden correctos.
- **Relaciones:** `coach` con `cascadeDelete` falso (si el coach se desactiva se conservan los datos).

### Cambios en `class_sessions` (extensión sobre 009)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `title` | text (opcional) | Nombre del evento; obligatorio para `kind = special` |

- No se cambian los campos ni el índice único existentes. Las sesiones `private` y `special` no tienen `template`.

---

## Reglas de dominio

- **Sesión privada.** Servicio de `kind = personal`; `coach` obligatorio, activo y con rol `coach` u `owner`; capacidad 1 o 2. Capacidad 2 solo si todos los clientes invitados tienen una membresía activa con `plans.partner = true` para ese servicio; con un solo cliente partner se puede crear con capacidad 2 (el segundo cupo queda libre) o 1. Con dos clientes se exige capacidad 2.
- **Disponibilidad.** El inicio y el fin local de la sesión deben quedar contenidos en un único tramo de `coach_availability` del coach para ese día. Si el coach no tiene tramos, no se puede agendar privada. Decisión: fuera de disponibilidad se rechaza (no hay override); el admin primero amplía la disponibilidad.
- **Choques.** El intervalo `[starts_at, starts_at + duration)` no puede solaparse con otra sesión `scheduled` del mismo coach de cualquier `kind` (incluye clases grupales de 009), ni con un `schedule_block` que cubra esa fecha local. Tocarse en el borde (una termina cuando otra empieza) no es choque. Al editar se excluye la propia sesión.
- **Sesión especial.** `title` obligatorio, `service` de cualquier tipo, capacidad ≥ 1, coach opcional; si hay coach se validan choques pero no disponibilidad (los eventos pueden salir del horario habitual). No requiere plantilla ni consume créditos (013: `requiresCredit` es falso para `special`); las reservas y la cancelación siguen las reglas de 011.
- **Créditos en privadas.** Cada cliente reservado consume un crédito de su membresía al asistir (013); la elegibilidad se comprueba con `checkEligibility` antes de crear las reservas y todo se revierte si alguno falla (a menos que se envíe `override_note` para ese cliente).
- **Cancelación.** Una sesión privada con todas sus reservas canceladas se puede marcar `cancelled` por el admin; la cancelación del cliente sigue la ventana de `services.cancellation_hours` (011).

---

## Arquitectura de Cambios

### Fase 1: Modelo de datos (Tarea 001)

**001 - Migraciones de `coach_availability` y `title`**
- `api/pb_migrations/<timestamp>_created_coach_availability.js` y `<timestamp+1>_added_title_to_class_sessions.js`, con `up`/`down`.

### Fase 2: Lógica pura (Tarea 002)

**002 - Lib de agendado**
- `api/src/lib/scheduling.ts`: `toMinutes`, `intervalsOverlap`, `isWithinAvailability`, `findCoachConflicts`, `validateAvailabilitySlots`, `privateCapacity`, `validatePrivateSession`, `validateSpecialSession`; pruebas `bun test`.

### Fase 3: Servidor (Tareas 003-004)

**003 - Hooks de validación**
- `api/src/hooks/scheduling.ts`: validación de `coach_availability` y de `class_sessions` (`private`/`special`) en los hooks de escritura del modelo, con un hook de petición que dirige el alta de privadas a la ruta transaccional; registro en `audit-config.ts`.

**004 - Ruta para agendar sesión privada**
- `POST /api/admin/sessions/private` en transacción: crea sesión y reservas con la autorización de reservas y la selección de membresía de 013. La consulta previa de elegibilidad usa `checkEligibility`.

### Fase 4: Interfaz (Tareas 005-007)

**005 - Composables y componentes**
- `useCoachAvailability`, `useCoachAgenda`, `AvailabilityEditor`, `PrivateSessionDialog`, `SpecialSessionDialog`, `CoachAgendaGrid`.

**006 - Vistas de disponibilidad y agenda**
- `CoachAvailabilityView` y `CoachAgendaView`, rutas `/agenda` y `/agenda/disponibilidad`, entrada de navegación.

**007 - Integración con el calendario de 009**
- Botones "Nueva clase especial" y "Sesión privada" en el calendario; las sesiones `private`/`special` se distinguen por color e insignia y se editan/cancelan desde allí.

### Fase final: Verificación y cierre (Tarea 008)

**008 - Documentación y verificación**
- READMEs, casos en `scripts/verify-api.sh` y cierre.

---

## Impacto por Módulo

| Ruta | Cambio |
|------|--------|
| `api/pb_migrations/` | Dos migraciones |
| `api/src/lib/` | `scheduling.ts` y pruebas; `audit-config.ts` |
| `api/src/hooks/` | `scheduling.ts` y ruta de sesión privada |
| `app/src/composables/`, `components/agenda/` | Composables y componentes |
| `app/src/views/admin/` | `CoachAgendaView.vue`, `CoachAvailabilityView.vue`; calendario de 009 ampliado |
| `app/src/router/index.ts`, `layouts/admin-nav.ts` | `/agenda`, `/agenda/disponibilidad` |
| `api/README.md`, `app/README.md`, `scripts/` | Documentación y verificación |

---

## Flujos Críticos

### Flujo 1: Agendar una sesión privada para dos clientes partner
```
1. Reception abre "Sesión privada", elige coach, servicio personal, fecha y dos clientes
2. La UI precomprueba disponibilidad; el servidor valida partner, disponibilidad, choques y créditos
3. En una transacción se crea la sesión (capacidad 2) y dos reservas
4. Resultado: aparece en la agenda del coach y en el calendario; al asistir cada uno consume 1 crédito
```

### Flujo 2: Choque de horario
```
1. Se intenta agendar a las 10:00 con un coach que dirige una clase grupal 10:30-11:30
2. findCoachConflicts detecta el solape → 400 coach_conflict con la sesión en conflicto
3. Resultado: no se crea sesión ni reservas
```

### Flujo 3: Clase especial
```
1. Desde el calendario se pulsa "Nueva clase especial" con título, fecha, capacidad y coach opcional
2. Se valida y se crea con kind = special
3. Resultado: visible en el calendario con insignia propia; se reserva con las reglas de 011 sin consumir créditos
```

---

## Notas de Implementación

### Decisiones
- **Sin override de disponibilidad**: se corrige la disponibilidad, no la regla; evita sesiones fuera de horario sin rastro.
- **Especiales sin créditos ni disponibilidad**: son eventos puntuales con cobro aparte (014, manual).
- **`title` en `class_sessions`**: campo opcional en el esquema, obligatorio para las sesiones especiales.
- **Ruta única para privadas**: crear sesión y reservas por separado dejaría sesiones huérfanas si falla un cupo o un crédito.
- **Reutilizar `class_sessions`** (no una tabla aparte): cancelaciones, asistencia y calendario ya funcionan con ellas.

### Migraciones
- `api/pb_migrations/` con `up`/`down`; timestamps mayores que el último presente; `down` de `title` solo elimina el campo.

### Convención de código
- Lógica pura en `api/src/lib/scheduling.ts`. El acceso a datos vive en `scheduling-store.ts` y los hooks lo cargan con `require` dentro de cada callback.
- Conversión UTC↔hora local con el helper de 009; en la UI con `app/src/lib/datetime.ts`.
- Comparaciones en minutos desde medianoche local; sin `Intl` en servidor.

### Seguridad
- Un coach solo gestiona su propia disponibilidad y agenda; reglas cerradas y rutas con control de rol; auditoría de `coach_availability` y de las sesiones creadas.

### Fuera de alcance
- Reserva por el propio cliente o portal (no hay clientes autenticables); pagos de sesiones especiales (014 manual); publicación web (019); sincronización con calendarios externos; reasignación masiva de sesiones al cambiar disponibilidad.

---

## Criterios de Aceptación

- [x] Un coach (u owner) define tramos semanales sin solapes; un coach no edita los de otro.
- [x] Agendar una privada fuera de disponibilidad o con choque devuelve `400` con el código correspondiente y no crea nada.
- [x] Una privada para dos clientes exige capacidad 2 y membresías partner; con un cliente no partner la capacidad queda en 1.
- [x] Las reservas de la privada respetan créditos (013); si falla una, no queda ninguna.
- [x] La agenda por coach muestra día y semana con sesiones, clientes reservados y disponibilidad.
- [x] Se puede crear una clase especial desde el calendario, con título y sin consumir créditos.
- [x] `scripts/verify-api.sh` y `scripts/verify-app.sh` terminan en verde.

---

## Dependencias Entre Tareas

```
Feature 009, 011, 013 (contrato) → 001
001 (migraciones)                → 003
002 (lib agendado)               → 003, 004
003 (hooks)                      → 004
004 (ruta privada)               → 005
005 (componentes)                → 006, 007
006                              → 007
004, 007                         → 008 (documentación y verificación)
```

---

## Validación Post-Deploy

1. `scripts/verify-api.sh` y `scripts/verify-app.sh` en verde.
2. Definir disponibilidad de un coach y agendar una privada dentro del tramo: aparece en la agenda y el calendario.
3. Repetirla en un horario solapado: error de choque.
4. Crear una clase especial desde el calendario y reservar a un cliente sin membresía: se permite y no hay movimiento de créditos.
5. Reservar una privada a un cliente sin créditos: se rechaza; con excepción y nota se permite.

---

## Prompt y modelo utilizado

### Modelo

Sonnet 5.5

### Contexto: lista de características aprobada

Esta feature sale de la lista de características aprobada por el usuario (el CRM/leads quedó descartado explícitamente). Alcance aprobado para esta feature:

> `coach_availability`, sesiones `kind = private` (capacidad 1 o 2 según plan partner) y `kind = special` (eventos/clases únicas) sobre `class_sessions`; UI de disponibilidad por coach, agendar sesión privada para uno o dos clientes validando choques de horario, vista agenda por coach (día/semana), integración con reservas y créditos, alta de clases especiales desde el calendario.

### Prompt

```
Ok, con base en esta lista estructuremos los features que debemos implementar. Cada feature dejala plasmada en español en features/NNN-.../spec.md, crea las carpetas de ser necesario respetando el consecutivo, puedes usar features/spec-template.md como plantilla. Luego con base en ese spec crea las tareas granulares en features/NNN-.../tasks/NNN-....md, creando un consecutivo ordenado, tasks debidamente priorizadas teniendo en cuenta dependencias resueltas con anterioridad, puedes usar features/task-template.md como plantilla. Ten en cuenta la prelación entre unas y otras de manera de generar todo con la prioridad y orden adecuado.
```
