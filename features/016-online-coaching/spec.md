# Especificación: Online Coaching

- **Estado:** Pendiente

## Resumen Ejecutivo

Este conjunto de 7 tareas añade el seguimiento de clientes de Online Coaching: `coaching_programs` (programa, coach, estado y renovación vinculada a una membresía) y `coaching_checkins` (adherencia 1-5 y notas), con la vista `/coaching`, la pestaña "Coaching" en el perfil del cliente y alertas de renovación y de check-in pendiente. El alcance sale del servicio real publicado en `web/src/pages/online-coaching.astro`: programas personalizados de 8 a 16 semanas con planes de entrenamiento, guía de nutrición y monitoreo de progreso mediante check-ins, con precio acordado tras una consulta. Esta feature es solo el **seguimiento interno** del coach; no entrega planes de entrenamiento ni de nutrición al cliente.

Entrega:

1. **Modelo de datos**: `coaching_programs` y `coaching_checkins`.
2. **Lógica pura** (`api/src/lib/coaching.ts`): semana del programa, adherencia promedio y tendencia, check-in pendiente y alerta de renovación.
3. **Hooks**: validación de programas y check-ins, y sincronización con la membresía (renovación y pausa).
4. **UI**: vista `/coaching` con filtros y alertas, registro de check-ins, y pestaña "Coaching" en el perfil del cliente.

Contrato que deja a las siguientes: 017 lee adherencia, retención y programas activos; 018 puede usar `renews_on` para avisos de renovación.

---

## Estado actual del repositorio (punto de partida)

| Elemento | Estado |
|----------|--------|
| `web/src/pages/online-coaching.astro` | Describe el servicio: beneficios (planes de entrenamiento, guía de nutrición, programas de 8-16 semanas, monitoreo de progreso con check-ins y ajustes), consulta gratuita inicial y precio comunicado tras la consulta; formulario de solicitud (CRM, fuera de alcance) |
| `api/` | PocketBase; migraciones JS en `api/pb_migrations/` (última existente: `1795260843_created_admins.js`; usar timestamp mayor que el de la última presente); hooks y libs TypeScript compilados con `bun run build:ts` |
| `coaching_programs`, `coaching_checkins` | No existen (esta feature los crea) |
| `services` (kind `online`) y `plans` (008), `clients` (010), `memberships` y sus rutas (013), coaches (007) | No existen aún en disco; se usan por contrato |
| Perfil del cliente (010) | Por contrato; verificar nombres reales al implementar |

> Verificación obligatoria previa: la tarea 001 debe confirmar cómo 008 modela el plan online (servicio `kind = online`, `commitment_periods` 2-4 equivalentes a 8-16 semanas) y que 013 permite membresías de ese servicio sin reservas de clase.

---

## Modelo de datos

### Colección `coaching_programs` (base)

| Campo | Tipo | Reglas | Descripción |
|-------|------|--------|-------------|
| `client` | relation→clients | required | Cliente remoto |
| `coach` | relation→admins | required | Coach responsable (rol `coach` u `owner`, activo) |
| `membership` | relation→memberships | opcional | Membresía que financia el programa (plan de un servicio `online`) |
| `status` | select | `active`, `paused`, `ended`; required | Estado |
| `starts_on` | date | required | Inicio (fecha local) |
| `renews_on` | date | opcional | Próxima renovación; se sincroniza con `memberships.current_period_end + 1` |
| `duration_weeks` | number | 8, 12 o 16 | Extensión: duración acordada del programa |
| `goal` | text | opcional | Objetivo del cliente |
| `program_url` | url | opcional | Enlace externo al plan de entrenamiento (Drive, app de terceros) |
| `notes` | text | opcional | Notas internas del coach |

- **Índices:** `(status, renews_on)`, `(coach, status)`, `(client)`; único parcial `(client)` donde `status IN ('active','paused')` (un programa vivo por cliente).
- **Reglas de API:** `listRule`/`viewRule` = staff; `createRule`/`updateRule` = owner, reception o el propio coach (`coach = @request.auth.id`); `deleteRule` = owner.
- **Relaciones:** sin `cascadeDelete`; los programas terminados se conservan.

### Colección `coaching_checkins` (base)

| Campo | Tipo | Reglas | Descripción |
|-------|------|--------|-------------|
| `program` | relation→coaching_programs | required | Programa |
| `checked_at` | date | required, no futura | Fecha local del check-in |
| `adherence` | number | entero 1-5 | Adherencia al plan (1 muy baja, 5 total) |
| `notes` | text | opcional | Observaciones y ajustes |
| `created_by` | relation→admins | opcional | Extensión: quién lo registró |

- **Índices:** `(program, checked_at)`.
- **Reglas de API:** `listRule`/`viewRule` = staff; `createRule`/`updateRule` = owner o coach del programa (`program.coach = @request.auth.id`); `deleteRule` = owner. Reception solo lee.

### Máquina de estados de `coaching_programs`

```
active ⇄ paused
active | paused → ended   (final: para retomar se crea otro programa)
```

---

## Reglas de dominio

- **Alta.** El cliente debe tener una membresía `active` de un plan cuyo servicio sea `kind = online`; se enlaza en `membership`. `duration_weeks` ∈ {8, 12, 16}; `renews_on` inicial = `current_period_end + 1`.
- **Renovación vinculada.** Cuando 013 renueva la membresía, el hook mueve `renews_on`. Si la membresía pasa a `paused`/`active`, el programa se pausa/reanuda; si pasa a `cancelled` el programa queda `ended`; si pasa a `expired` el programa no cambia y aparece la alerta "Membresía vencida".
- **Fin.** `ends_on` derivado = `starts_on + duration_weeks * 7`. Al llegar la fecha sin renovar, el programa se muestra como "Por finalizar" en la vista; terminar es siempre una acción del coach (no automática).
- **Check-in.** Cadencia esperada semanal (`CHECKIN_CADENCE_DAYS = 7`): "check-in pendiente" si han pasado más de 7 días desde el último (o desde `starts_on`). No se permiten check-ins en programas `ended`; la fecha no puede ser futura.
- **Adherencia.** Promedio de los últimos 4 check-ins y tendencia (`up | flat | down`) comparando con los 4 anteriores; adherencia ≤ 2 en el último marca "En riesgo".
- **Alertas de renovación.** `renews_on` dentro de 7 días (`renewal_soon`), vencida (`renewal_overdue`) o membresía vencida (`membership_expired`).

---

## Arquitectura de Cambios

### Fase 1: Modelo de datos (Tarea 001)

**001 - Migraciones de `coaching_programs` y `coaching_checkins`**
- Dos migraciones con `up`/`down`, índices y reglas.

### Fase 2: Lógica pura (Tarea 002)

**002 - Lib de coaching**
- `api/src/lib/coaching.ts`: `programWeek`, `endsOn`, `adherenceSummary`, `needsCheckin`, `renewalAlert`, `programFlags`, `validateCheckin`, `validateProgramInput`; pruebas.

### Fase 3: Servidor (Tarea 003)

**003 - Hooks de validación y sincronización**
- `api/src/hooks/coaching.ts`: validaciones y sincronización con `memberships`; registro en `audit-config.ts`.

### Fase 4: Interfaz (Tareas 004-006)

**004 - Composable y componentes**
- `useCoaching`, `ProgramFormDialog`, `CheckinDialog`, `AdherenceBadge`, `CheckinTimeline`, `ProgramStatusTag`.

**005 - Vista `/coaching`**
- `CoachingView.vue` con filtros, alertas y detalle; ruta y entrada de navegación.

**006 - Pestaña Coaching en el perfil del cliente**
- Pestaña que muestra el programa vivo, su historial de check-ins y alta rápida.

### Fase final: Verificación y cierre (Tarea 007)

**007 - Documentación y verificación**
- READMEs, sección "Después" y scripts.

---

## Impacto por Módulo

| Ruta | Cambio |
|------|--------|
| `api/pb_migrations/` | Dos migraciones |
| `api/src/lib/` | `coaching.ts` y pruebas; `audit-config.ts` |
| `api/src/hooks/` | `coaching.ts` |
| `app/src/composables/`, `components/coaching/` | `useCoaching` y componentes |
| `app/src/views/admin/` | `CoachingView.vue`; perfil del cliente (010) ampliado |
| `app/src/router/index.ts`, `layouts/admin-nav.ts` | `/coaching` |
| `api/README.md`, `app/README.md`, `scripts/` | Documentación y verificación |

---

## Flujos Críticos

### Flujo 1: Alta de un cliente remoto
```
1. Tras la consulta, reception asigna el plan online al cliente (013)
2. En /coaching pulsa "Nuevo programa": cliente, coach, duración (12 semanas), objetivo y enlace del plan
3. El hook valida la membresía online activa y fija renews_on
4. Resultado: el programa aparece activo con su coach y fecha de renovación
```

### Flujo 2: Check-in semanal
```
1. El coach abre el programa y registra fecha, adherencia 4 y notas
2. El hook valida fecha no futura y programa no finalizado
3. Resultado: el promedio y la tendencia se actualizan; desaparece la alerta de check-in pendiente
```

### Flujo 3: Renovación
```
1. Reception renueva la membresía (013)
2. El hook mueve renews_on al nuevo fin de periodo + 1
3. Resultado: la alerta de renovación se limpia; si la membresía se cancela, el programa pasa a ended
```

---

## Notas de Implementación

### Decisiones
- **Solo seguimiento, sin entrega de planes**: `program_url` es un enlace externo y `notes` texto libre. La entrega de planes de entrenamiento y nutrición dentro de la plataforma (biblioteca de ejercicios, plantillas, portal del cliente) queda como **"Después"**.
- **Renovación = membresía**: no hay lógica de cobro en el programa; la fecha se deriva de 013 y los pagos de 014.
- **`duration_weeks` como campo extra** (8/12/16): refleja las opciones públicas del servicio y permite calcular fin y semana actual; el contrato no lo incluye. Revisar.
- **Un programa vivo por cliente** (índice único parcial): evita duplicados; retomar crea uno nuevo.
- **Reception puede crear/editar programas pero no check-ins**: los check-ins son trabajo del coach.
- **El programa no termina solo**: evita perder el seguimiento por un retraso en la renovación.

### Migraciones
- `api/pb_migrations/<timestamp>_created_coaching_programs.js` y `..._created_coaching_checkins.js` con `up`/`down`, timestamp mayor que el último presente.

### Convención de código
- Lib pura `api/src/lib/coaching.ts` sin `$app`; `today` por parámetro; hooks con `require(`${__hooks}/lib/coaching`)` en cada callback.
- Fechas locales `YYYY-MM-DD`.
- UI en español con PrimeVue 5.

### Seguridad
- Reglas cerradas; el coach solo escribe check-ins de sus programas; notas internas visibles solo para staff; auditoría de programas y check-ins.

### Fuera de alcance
- Entrega de planes de entrenamiento/nutrición, mensajería con el cliente, portal o app del cliente, subida de fotos de progreso, medidas corporales (queda "Después"); consulta inicial y captación (CRM descartado); cobros (014); avisos automáticos al cliente (018).

---

## Criterios de Aceptación

- [ ] Se crea un programa solo para clientes con membresía online activa; no se permiten dos vivos por cliente.
- [ ] Los check-ins validan adherencia 1-5, fecha no futura y programa no finalizado.
- [ ] Renovar la membresía actualiza `renews_on`; pausar/cancelar la membresía pausa/finaliza el programa.
- [ ] `/coaching` filtra por estado, coach y alerta (renovación, sin check-in, en riesgo) y muestra adherencia promedio y último check-in.
- [ ] La pestaña Coaching del perfil muestra programa e historial y permite registrar check-ins.
- [ ] La lógica pura tiene pruebas `bun test` y la UI pruebas Vitest.
- [ ] `scripts/verify-api.sh` y `scripts/verify-app.sh` terminan en verde.

---

## Dependencias Entre Tareas

```
Feature 010, 013 (contrato)  → 001, 003
001 (migraciones)            → 003
002 (lib coaching)           → 003, 004
003 (hooks)                  → 004
004 (composable)             → 005, 006
005, 006                     → 007 (documentación y verificación)
```

---

## Validación Post-Deploy

1. `scripts/verify-api.sh` y `scripts/verify-app.sh` en verde.
2. Crear un programa para un cliente con plan online: aparece en `/coaching` con renovación.
3. Intentar crearlo sin membresía online: error.
4. Registrar un check-in con adherencia 6: error; con 4: promedio actualizado.
5. Renovar la membresía: `renews_on` avanza 28 días.

---

## Prompt y modelo utilizado

### Modelo

Sonnet 5.5

### Contexto: lista de características aprobada

Esta feature sale de la lista de características aprobada por el usuario (el CRM/leads quedó descartado explícitamente). Alcance aprobado para esta feature:

> `coaching_programs` y `coaching_checkins`; seguimiento de clientes remotos (programa, coach, renovación vinculada a membresía), check-ins con adherencia 1-5 y notas, estados activo/pausado/finalizado, vista `/coaching` y pestaña en el perfil, alertas de renovación. Sin entrega de planes de entrenamiento (queda como "Después").

### Prompt

```
Ok, con base en esta lista estructuremos los features que debemos implementar. Cada feature dejala plasmada en español en features/NNN-.../spec.md, crea las carpetas de ser necesario respetando el consecutivo, puedes usar features/spec-template.md como plantilla. Luego con base en ese spec crea las tareas granulares en features/NNN-.../tasks/NNN-....md, creando un consecutivo ordenado, tasks debidamente priorizadas teniendo en cuenta dependencias resueltas con anterioridad, puedes usar features/task-template.md como plantilla. Ten en cuenta la prelación entre unas y otras de manera de generar todo con la prioridad y orden adecuado.
```
