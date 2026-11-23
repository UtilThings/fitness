# JQ Fitness app

SPA de JQ Fitness con Vite, Vue 3, TypeScript, PrimeVue (tema Aura), Tailwind CSS v4 y el SDK de PocketBase.

## Requisitos e instalación

- Node.js 24, según `.nvmrc` (mínimo 22.12).
- Bun 1.4.3 para instalar dependencias y ejecutar scripts.
- Un servidor PocketBase accesible (ver `api/`).

```bash
cd app
bun install --frozen-lockfile
cp .env.example .env
bun run dev
```

Abre http://localhost:5173. Sin sesión, `/` redirige a `/login`.

## Variables de entorno

| Variable                | Obligatoria | Descripción                                                                   |
| ----------------------- | ----------- | ----------------------------------------------------------------------------- |
| `VITE_POCKETBASE_URL`   | Sí          | URL base de PocketBase, sin barra final (por defecto `http://127.0.0.1:8090`) |
| `VITE_BUSINESS_CONTACT` | No          | Contacto público que figura en la cabecera de los recibos.                    |

Solo `src/lib/env.ts` lee `import.meta.env`. Las variables `VITE_*` llegan al navegador: nunca pongas secretos en ellas.

## Scripts

| Script                            | Descripción                                |
| --------------------------------- | ------------------------------------------ |
| `bun run dev`                     | Servidor de desarrollo con HMR             |
| `bun run build`                   | Comprueba tipos y genera `dist/`           |
| `bun run preview`                 | Sirve `dist/`                              |
| `bun run typecheck`               | `vue-tsc -b`                               |
| `bun run lint` / `lint:fix`       | ESLint                                     |
| `bun run format` / `format:check` | Prettier                                   |
| `bun run test` / `test:watch`     | Vitest (usa `bun run test`, no `bun test`) |

`scripts/verify-app.sh`, en la raíz del repositorio, ejecuta todos los pasos de calidad y falla en el primero que falle.

## Estructura

```
src/
  assets/       recursos importados desde código
  components/   componentes reutilizables de autenticación y administración
  composables/  sesión, colecciones, avisos y confirmaciones
  layouts/      AuthLayout, AdminLayout y admin-nav.ts (menú lateral)
  lib/          entorno, PocketBase, permisos, fechas y dinero
  router/       rutas, guard y safeRedirect
  styles/       main.css (Tailwind + tailwindcss-primeui)
  types/        tipos TypeScript de las colecciones
  views/        vistas por área: auth/, admin/ y errores de navegación
```

## Convenciones

- Alias `@/` para `src/`.
- Componentes con `<script setup lang="ts">`. Los componentes de PrimeVue se importan explícitamente (`import Button from 'primevue/button'`).
- Usa siempre `pb` de `@/lib/pocketbase`; no crees otras instancias de `PocketBase`.
- Modo oscuro: añade la clase `app-dark` a `<html>`. Las utilidades `dark:` de Tailwind siguen esa clase.
- Las utilidades de `tailwindcss-primeui` (`bg-primary`, `text-surface-500`...) usan los tokens del tema.
- El guard del router es solo experiencia de usuario; la autorización real son las reglas de API de PocketBase.

## Layouts y vistas

Los layouts son rutas padre con `<RouterView />`; las vistas solo aportan su contenido.

- `AuthLayout`: tarjeta centrada con el logo. Cada vista pone su título con `AuthHeading`. Rutas: `/login`, `/forgot-password`.
- `AdminLayout`: barra lateral flotante (`Sidebar*` de PrimeVue 5), cabecera con el título de `route.meta.title` y menú de usuario. En escritorio se colapsa a iconos; por debajo de 768 px es un panel superpuesto. Protege todas sus hijas (`meta.requiresAuth`).

### Agregar una vista de auth

1. Crea `src/views/auth/MiVista.vue` (empieza con `<AuthHeading title="..." />`).
2. Añádela como hija del padre `AuthLayout` en `src/router/index.ts`, con `name` y `meta.title`. Si no debe verse con sesión iniciada, agrega su `name` a `authRoutes`.

## Módulos de administración

1. Define el tipo de la colección en `src/types/pb.ts`. Usa `BaseRecord` como base, campos en `snake_case`, relaciones como IDs de tipo `string`, `expand?` para relaciones expandidas y fechas ISO UTC.
2. Crea una vista en `src/views/admin/` y regístrala como hija de `AdminLayout` con `name` y `meta.title`. Activa su entrada en `admin-nav.ts` quitando `placeholder` cuando la ruta esté disponible.
3. Declara `meta.roles` si la vista está restringida y usa los mismos roles en el menú. El router envía al usuario a `/forbidden` si su rol queda fuera. Para acciones dentro de la vista, añade el permiso a `permissions.ts` y consúltalo con `useAuth().can(permiso)`. Las reglas de PocketBase autorizan las operaciones.

Por ejemplo, para listar el equipo, importa los componentes compartidos y usa este patrón en la vista:

```vue
<script setup lang="ts">
import { onMounted } from 'vue';
import DataToolbar from '@/components/DataToolbar.vue';
import EmptyState from '@/components/EmptyState.vue';
import PageHeader from '@/components/PageHeader.vue';
import { useCollection } from '@/composables/useCollection';
import type { Admin } from '@/types/pb';

const { items, error, loading, load, search } = useCollection<Admin>('admins', {
  sort: 'name',
});
onMounted(load);
</script>

<template>
  <PageHeader title="Equipo" />
  <DataToolbar
    placeholder="Buscar por nombre o correo"
    @search="search($event, ['name', 'email'])"
  />
  <p v-if="error" role="alert">{{ error.message }}</p>
  <p v-else-if="loading" role="status">Cargando equipo…</p>
  <EmptyState
    v-else-if="!items.length"
    icon="pi pi-users"
    title="Sin integrantes"
  />
  <ul v-else>
    <li v-for="item in items" :key="item.id">{{ item.name }}</li>
  </ul>
</template>
```

Usa `total`, `page` y `perPage` para paginar con `setPage`. `setSort` y `search` vuelven a la primera página. Para aplicar filtros desde el slot `filters`, asigna cláusulas `{ expression: 'active = {:active}', params: { active: true } }` a `filters.value` y ejecuta `setPage(1)`. Reserva las expresiones y los nombres de campo para código del módulo y pasa las entradas del usuario en `params`.

Usa `StatusTag` para asociar cada estado a `{ label, severity }`. En el botón de borrado, llama a `useConfirmDelete().confirmDelete({ message, onConfirm })` y ejecuta `remove(id)` dentro de `onConfirm`. `create` y `update` devuelven el registro y `remove` devuelve la confirmación booleana del SDK. Las tres operaciones recargan la lista tras una escritura exitosa. En caso de rechazo, muestra `error.fields` junto a los campos y usa `useNotify()` para el aviso de éxito o error.

Para mostrar fechas de PocketBase, usa `formatDateTime(iso)` de `datetime.ts`. Convierte la fecha y hora local de un formulario con `localToUtcIso(date, time)` antes de guardar. La zona del negocio es `America/New_York`. Guarda importes en centavos, muéstralos con `formatUsd(cents)` y valida la entrada con `parseUsdToCents(text)`, que devuelve `null` si es inválida.

## Equipo y perfil

- **Equipo** (`/team`) permite buscar por nombre o correo y filtrar por rol y estado. El owner puede crear integrantes, activar o desactivar cuentas y pedir su baja. Si el API devuelve `409`, puede conservar el historial desactivando la cuenta.
- **Ficha del equipo** (`/team/:id`) muestra los datos de contacto, el estado y la matriz de permisos. El owner puede editar la ficha de otro integrante.
- **Mi perfil** (`/settings/profile`) permite actualizar nombre, teléfono, biografía y foto. Al guardar una nueva contraseña, la app renueva la sesión con la nueva clave.

Para un selector que use `useTeam().coaches`, llama a `loadCoaches` al montar el formulario. La consulta incluye owners y coaches activos ordenados por nombre, independientemente de los filtros o la paginación del listado. `coachesError` expone los errores de la consulta.

```ts
const { coaches, loadCoaches, coachesError } = useTeam();
onMounted(loadCoaches);
```

## Catálogo

- **Servicios** (`/services`) está en **Ajustes**. Desde allí se consultan los cupos, el coach por defecto y la política de cancelación. El owner puede crear, editar, mover y desactivar servicios. El cuadro de confirmación muestra cuántos planes activos se desactivarán también.
- **Planes** (`/plans`) está en **Catálogo**. El filtro por servicio queda en la URL y las flechas cambian el orden dentro de ese servicio. El formulario recibe el precio en dólares, por ejemplo `1447.25`, y guarda `144725` centavos USD. Marcar **Primera clase** fija el precio en cero y la unidad en **Primera visita**.
- **Coach** y **reception** tienen acceso de lectura. Cuando un registro tiene dependientes, el owner puede desactivarlo y conservar su historial.

Ejecuta `scripts/verify-app.sh` desde la raíz para correr las pruebas de las vistas, los composables y las validaciones del catálogo junto con las demás comprobaciones de la app.

## Horarios y clases

- **Clases** (`/classes`) muestra la semana en hora de Miramar. Se puede navegar a semanas anteriores y siguientes, filtrar por servicio, coach o tipo y usar **Mis clases**. Owner y reception pueden cambiar el coach y las notas desde el detalle, y mover las sesiones regulares o especiales. Cancelar o mover exige un motivo. Owner también puede generar cuatro semanas desde el domingo de la semana visible.
- **Plantillas** (`/classes/templates`) agrupa las franjas semanales por día. Owner puede editarlas, activarlas y asignar un coach, con la opción de actualizar las sesiones futuras. El parámetro `?coach=<id>` filtra por coach asignado.
- **Bloqueos** (`/classes/blocks`) muestra los días sin clases. Antes de guardar, el formulario consulta cuántas sesiones programadas se cancelarán y pide confirmación.
- **Ver horario** en una ficha del equipo abre `/classes?coach=<id>`. Coach y reception pueden consultar plantillas y bloqueos.

## Agenda de Personal Training y sesiones especiales

- **Agenda** (`/agenda`) muestra el día o la semana del coach con sus tramos de disponibilidad, sesiones, cupos y clientes. El detalle enlaza con la gestión de reservas y asistencia de **Clases**.
- **Disponibilidad semanal** (`/agenda/disponibilidad`) permite editar varios tramos por día. Owner puede editar los tramos de cualquier coach activo, cada coach puede editar los suyos y reception tiene acceso de lectura. El editor valida el orden de las horas y los solapes.
- **Sesión privada** está disponible desde **Agenda**, **Clases** y los huecos del calendario. Se elige un servicio personal y uno o dos clientes. El formulario avisa sobre disponibilidad, créditos y membresías partner. Owner y reception pueden añadir una nota de excepción por cliente.
- **Nueva clase especial** está disponible en **Clases** para owner y reception. Pide un título y permite dejar el coach sin asignar. El calendario muestra las insignias **Especial** y **Privada**. El detalle permite editar el título de una especial y el cupo, el coach y las notas de ambos tipos, además de cancelarlos con motivo.

`useCoachAvailability` gestiona los tramos semanales y `useCoachAgenda` consulta sesiones con reservas y clientes o crea una sesión privada o especial. `AvailabilityEditor`, `CoachAgendaGrid`, `PrivateSessionDialog` y `SpecialSessionDialog` viven en `src/components/agenda/`. La interfaz muestra las fechas en hora de Miramar y la API recibe instantes UTC.

## Clientes

`/clients` lista clientes con búsqueda paginada y guarda el texto y el estado en los parámetros `q` y `status` de la URL. Si se omite el estado, muestra clientes activos. La lista también acepta `plan` para filtrar por plan activo y `membership` para distinguir clientes con o sin membresía activa. El perfil `/clients/:id` edita datos, objetivos, notas y evaluación inicial. Los owners también pueden corregir la marca de primera clase gratis y eliminar clientes sin historial.

### Seleccionar un cliente

Importa `ClientPicker` desde `@/components/clients/ClientPicker.vue`. El `v-model` usa `Client | null`. Guarda `selectedClient.id` como relación de PocketBase cuando exista una selección. El componente consulta a partir de dos caracteres y admite un filtro opcional de estado.

```vue
<script setup lang="ts">
import { shallowRef } from 'vue';
import ClientPicker from '@/components/clients/ClientPicker.vue';
import type { Client } from '@/lib/clients';

const selectedClient = shallowRef<Client | null>(null);
</script>

<template>
  <ClientPicker
    v-model="selectedClient"
    label="Cliente de la reserva"
    status="active"
  />
</template>
```

### Registrar una sección de historial

En `src/views/admin/clients/history-sections.ts`, conserva la clave de la sección (`bookings` o `payments`), asigna su componente a `component` y cambia `available` a `true`. `ClientHistoryTab` instancia el componente con `clientId` y, cuando está disponible, el registro `client`. Usa el ID para filtrar la colección relacionada. El componente puede emitir `changed` tras una mutación que actualice datos del perfil. Las secciones pendientes muestran el número de su feature.

Queda pendiente decidir si se necesita importar clientes por CSV o exponer un endpoint de alta externa. El panel admite el alta manual.

## Reservas y asistencia

- En **Clases**, el calendario consulta la semana en una sola petición con `useSessionAvailability`. `AvailabilityTag` muestra los cupos reales como **Disponible**, **Casi llena** o **Llena**.
- En el detalle de una sesión, **Reservar** abre `BookingDialog` con `ClientPicker`. El diálogo avisa si la sesión está llena y ofrece **Primera clase gratis** cuando el cliente y el servicio son elegibles. `SessionRoster` muestra inscritos y lista de espera. Permite marcar asistencia desde el inicio de la sesión y corregirla con un motivo.
- En **Clientes → Historial → Reservas**, selecciona una fecha y una sesión próxima para abrir el mismo diálogo con el cliente ya seleccionado. El historial muestra fecha, servicio, estado y notas de excepción.
- Desde la sesión o el historial, `CancelBookingDialog` muestra el límite en hora de Miramar. Una cancelación tardía permite aplicar una excepción con motivo obligatorio. Al guardar, las vistas vuelven a consultar los datos y muestran las promociones y los resultados registrados.

`useBookings` consulta reservas por sesión o por cliente, envía altas y transiciones y convierte los errores de PocketBase en mensajes por campo. Los estados y sus etiquetas se definen en `src/lib/bookings.ts`.

## Membresías y créditos

- **Clientes → Membresías** muestra los planes activos y anteriores del cliente. Selecciona **Historial** junto al plan para ver el saldo, los movimientos y las reservas relacionadas. Owner y reception pueden asignar un plan activo desde esta pestaña. El diálogo muestra el aviso de primera visita o de compromiso cuando corresponde.
- **Clientes** permite seleccionar un **Plan activo** o filtrar por clientes con o sin membresía activa. El filtro de plan exige que ese mismo plan esté activo en la ficha del cliente.
- **Facturación → Suscripciones** (`/memberships`) muestra una lista paginada que se puede filtrar por estado, plan o **Renovación pendiente**. El menú **Acciones** permite renovar, pausar, reanudar, cancelar y ajustar el saldo según el estado. La pausa, la cancelación y el ajuste exigen una nota. Coach puede consultar la vista.
- Si una reserva supera la disponibilidad de créditos o el límite aplicable, **Excepción de créditos** permite a owner y reception reenviarla con una nota obligatoria. El saldo negativo se destaca como deuda en el historial.

`useMemberships` concentra las listas, el historial, las acciones y la preconsulta de elegibilidad. En `src/components/memberships/`, `MembershipStatusTag` deriva la renovación pendiente de la fecha local. `AssignPlanDialog`, `MembershipActions`, `CreditAdjustDialog`, `CreditLedger` y `CreditOverrideDialog` se comparten entre las vistas.

## Online Coaching

**Operaciones → Online Coaching** (`/coaching`) muestra programas activos, alertas de renovación, check-ins pendientes y clientes en riesgo. La tabla combina estado, coach, alerta y búsqueda por cliente. Muestra la semana del programa, la adherencia promedio y el último check-in. La vista comienza con los programas propios para el rol coach y con todos para owner y reception.

Al abrir un programa se consultan sus datos, el enlace al plan y el historial de check-ins. Owner y reception pueden crear y editar programas. El rol coach gestiona los programas que tiene asignados. Owner y el coach del programa pueden registrar un check-in y ver cómo se actualizan el promedio, la tendencia y las alertas.

**Clientes → Coaching** aparece si hay un programa actual o anterior o una membresía online. Muestra el programa vigente, el historial y los programas finalizados. Con una membresía activa y sin programa vigente, owner y coach pueden crear el programa para ese cliente. Reception tiene acceso de lectura en esta pestaña.

`useCoaching` consulta los programas, las membresías y los check-ins, y reutiliza la lógica de alertas de la API. `ProgramFormDialog`, `CheckinDialog`, `ProgramSummary`, `ProgramStatusTag`, `AdherenceBadge` y `CheckinTimeline` viven en `src/components/coaching/`. La suite Vitest cubre validación, filtros, roles, refresco y navegación.

### Después

La entrega de planes, el portal del cliente, las fotos y las medidas de progreso quedan para una entrega posterior. El seguimiento actual admite un enlace al plan externo.

## Pagos y recibos

- **Facturación → Pagos** (`/payments`) permite a owner y reception registrar un cobro, marcarlo como pagado, anularlo con motivo y abrir su recibo. La vista combina filtros de estado, método, cliente, fechas y **Solo vencidos**. El rango incluye ambos días y usa la fecha de pago cuando existe o el vencimiento para los demás cobros.
- **Clientes → Pagos** muestra el historial del cliente y sus totales de pagos, pendientes y vencidos. **Registrar pago** abre el formulario con ese cliente seleccionado. **Ver en Pagos** aplica el filtro de cliente en el listado general.
- **Recibo** (`/receipts/:id`) muestra el número, fecha, cliente, concepto, método, importe y la marca **ANULADO** cuando corresponde. **Imprimir** abre el diálogo del navegador con una hoja carta sin controles de navegación. Configura `VITE_BUSINESS_CONTACT` para imprimir el contacto público del negocio.

`usePayments` consulta la colección de pagos y usa rutas de servicio para registrar, liquidar y anular. `usePaymentsDue` consulta los vencimientos que usan Pagos y el dashboard. Los diálogos y estados compartidos viven en `src/components/payments/`. `src/lib/money.ts` formatea centavos USD y acepta coma o punto decimal en la captura.

## Dashboard operativo

En **Dashboard** (`/`) el equipo consulta las métricas del día de Miramar, la ocupación de las clases y las sesiones que necesitan coach o reservas. **Actualizar** vuelve a consultar el resumen y la pestaña visible se refresca cada minuto. Los enlaces de clase abren el detalle en `/classes?session=<id>`. Para owner y reception, **Cobros por vencer** muestra el conteo e importe de vencidos y de cobros por vencer en siete días. **Ver vencidos** abre `/payments?overdue=1`.

Para añadir una métrica, enlaza su dato de `useDashboard` en `DashboardView` y reutiliza `StatCard` con título, valor, icono y un destino opcional. Las tarjetas de listas se componen en `src/components/dashboard/` y comparten las fechas de `src/lib/datetime.ts`.

## Auditoría

Un owner activo abre **Ajustes → Auditoría** (`/audit`). La vista consulta 25 registros por página, del más reciente al más antiguo. Se puede combinar **Colección**, **Actor**, **Desde** y **Hasta**. El rango incluye ambas fechas de Miramar. **Ver cambios** muestra el valor anterior y el nuevo de cada campo. Los registros de acciones automáticas pueden aparecer con el actor **Sistema**.

## Reportes

En **Análisis → Reportes**, el equipo activo puede consultar Ocupación, Asistencia y Retención. La pestaña Ingresos está disponible para owner. Si un coach o un usuario de recepción abre `/reports?tab=revenue`, la vista muestra un aviso y evita la petición de ingresos. La API aplica el mismo permiso.

El rango se interpreta en hora de Miramar, Florida (`America/New_York`). Selecciona las fechas o un preset. Ocupación, Asistencia e Ingresos admiten el filtro de servicio. Ingresos y Retención permiten agrupar por día, semana o mes. Cada pestaña presenta totales, un gráfico y un selector de detalle. PrimeVue Chart y Chart.js se cargan de forma diferida al mostrar un gráfico en esta ruta.

**Exportar CSV** descarga las columnas del detalle seleccionado y todas sus filas filtradas. El archivo usa BOM UTF-8, separadores de coma y finales de línea CRLF. Las comillas internas se duplican y los textos que podrían interpretarse como fórmulas se prefijan con un apóstrofo. Los importes se exportan en dólares decimales con punto.

La prueba de ida y vuelta del CSV usa `python3` y su módulo estándar `csv`.

## Comunicaciones

En **Operaciones → Comunicaciones** (`/communications`), el equipo activo puede abrir tres pestañas:

- **Plantillas** muestra las versiones en español e inglés, las variables permitidas y la vista previa. El owner puede insertar variables en el texto, editar y activar o desactivar una plantilla. Coach y recepción tienen acceso de lectura.
- **Historial** muestra la fecha de Miramar, cliente, tipo, estado, intentos y error. Admite filtros por tipo, estado y fechas, paginación y actualización.
- **Mensaje a clase** permite seleccionar una clase próxima, revisar quién recibirá el correo, previsualizar el texto y confirmar el envío. La vista informa cuántos se enviaron, fallaron o se omitieron. El correo se dirige a inscritos confirmados o en espera con una dirección válida y estado activo o en pausa.

En **Clientes → Datos → Idioma de comunicaciones**, elige **Español** o **English** y guarda la ficha. El idioma se usa en los avisos posteriores. Para configurar o probar SMTP, consulta la sección «Comunicaciones del servicio» del README de la API. Este módulo se dedica a mensajes operativos y excluye marketing y seguimiento comercial.

## Aceptación del MVP

Ejecuta `scripts/verify-mvp.sh` desde la raíz. Usa PocketBase en localhost con una base temporal para aplicar las migraciones y comprobar las reglas efectivas, los hooks y las rutas. También ejecuta las pruebas, revisiones y build de la app. Para repetir el recorrido en el navegador, levanta API y app en desarrollo y prepara cuentas activas de owner, coach y recepción.

| Feature | Recorrido                                                                                                                                                                                                     | Resultado esperado                                                                                                                                                                                  |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 005–007 | Entra como owner. En **Equipo**, crea un coach y entra después con esa cuenta.                                                                                                                                | El owner puede dar de alta al coach. El coach puede iniciar sesión y consultar el equipo.                                                                                                           |
| 008     | Como owner, crea un servicio, asigna el coach por defecto y crea un plan para el servicio.                                                                                                                    | El equipo consulta el servicio y el plan. Solo el owner gestiona el catálogo.                                                                                                                       |
| 009     | En **Clases**, genera sesiones como owner. Abre el detalle de una clase.                                                                                                                                      | El calendario de Miramar muestra las sesiones generadas. Solo el owner genera sesiones y gestiona plantillas y bloqueos.                                                                            |
| 010     | Crea dos clientes activos. Abre su perfil desde **Clientes**.                                                                                                                                                 | El alta lleva a la ficha del cliente y las dos fichas aparecen en el listado activo.                                                                                                                |
| 011     | Usa una sesión futura con cupo 1. Reserva a dos clientes y cancela a tiempo la primera reserva. En otra sesión, cancela dentro del plazo de penalización. Tras el inicio de una sesión, marca una asistencia. | El segundo cliente entra en espera y asciende al liberar el cupo. La cancelación tardía queda registrada y la asistencia aparece en la sesión.                                                      |
| 012     | Compara el dashboard con las sesiones y reservas del día. Abre **Ajustes → Auditoría**, filtra por **Reservas**, actor y fechas y abre **Ver cambios**.                                                       | El resumen coincide con la agenda y las reservas en hora de Miramar. El diff refleja la operación registrada.                                                                                       |
| 005–012 | Entra como coach y recepción. Revisa catálogo, equipo, clases y acceso directo a `/audit`.                                                                                                                    | Los dos roles consultan catálogo, equipo y clases. Recepción puede gestionar sesiones especiales. El menú de auditoría solo aparece para owner y la API devuelve `403` a los demás roles de la app. |

El recorrido se verificó en Chromium con una base temporal de PocketBase. La suite HTTP cotejó los conteos del dashboard con las colecciones y comprobó permisos, cupos, cancelaciones, asistencia y cambios de auditoría. La prueba de horarios incluyó ambos cambios de hora de Nueva York.

## Despliegue

El servidor estático debe devolver `index.html` para cualquier ruta desconocida (fallback de SPA). El despliegue no forma parte del boilerplate.
