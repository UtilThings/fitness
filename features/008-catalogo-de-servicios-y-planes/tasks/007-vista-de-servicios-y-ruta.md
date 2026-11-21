# 007 - [Vista] Servicios: tabla, formulario, activación, orden y política

- **Prioridad:** 7
- **Estado:** Pendiente
- **Depende de:** 006, Feature 007 (contrato)
- **Fase:** Fase 3: Interfaz

## Objetivo

El owner gestiona los servicios desde `/services` (crear, editar, activar/desactivar, reordenar y definir la política de cancelación), y los demás roles solo los consultan.

## Contexto

`app/src/layouts/admin-nav.ts` es la única fuente de navegación y hoy tiene marcadores; `app/src/router/index.ts` define rutas hijas de `AdminLayout` con `meta.requiresAuth` y `meta.title`. `useAuth` permite conocer el rol para ocultar acciones de escritura (la API es la barrera real). Usar los componentes base de la feature 006 si existen; PrimeVue 5 aporta `DataTable`, `Dialog`, `ToggleSwitch`, `Select`, `InputNumber`.

## Alcance

- Crear `app/src/views/admin/ServicesView.vue`: `DataTable` con nombre, tipo (`Tag`), cupo, política de cancelación («24 h»), coach por defecto, estado y orden; botones subir/bajar (`move`), interruptor de activación con `ConfirmDialog` que avisa «Se desactivarán también sus N planes»; botón «Nuevo servicio» y edición en `Dialog`.
- Formulario: `name`, `slug` (autogenerado desde el nombre, editable solo al crear), `kind`, `description`, `capacity`, `cancellation_hours` (editor de política con texto de ayuda: personal 24 h, grupal 12 h), `default_coach`; errores del servidor por campo; `capacity` deshabilitado y 0 para `online`.
- El borrado muestra la sugerencia «Desactivar» cuando el servidor rechaza por dependientes.
- Modificar `app/src/router/index.ts` (ruta `services`, `meta.title: 'Servicios'`) y `admin-nav.ts` (entrada «Servicios», icono `pi pi-briefcase`, grupo Ajustes).
- Para roles distintos de `owner`: tabla en solo lectura (sin botones de escritura).
- Pruebas Vitest de la vista con composables simulados: render de filas, activar/desactivar con confirmación, error de validación en el diálogo, modo solo lectura.

## Criterios de aceptación

- [ ] `/services` lista los 5 servicios sembrados en orden `sort`.
- [ ] Cambiar `cancellation_hours` de un servicio persiste y se refleja en la tabla.
- [ ] Desactivar pide confirmación y deja el servicio y sus planes inactivos.
- [ ] Subir/bajar cambia el orden y se mantiene al recargar.
- [ ] Un usuario `coach` no ve acciones de escritura.
- [ ] Sin sesión, `/services` redirige a `/login?redirect=...`.
- [ ] `bun run test`, `typecheck`, `lint`, `format:check` y `build` pasan.

## Referencias

- `features/008-catalogo-de-servicios-y-planes/spec.md`, "Fase 3" → tarea 007.
- `app/src/layouts/admin-nav.ts`, `app/src/router/index.ts`.
- https://primevue.org/datatable/

## Fuera de alcance

- Vista de planes (008); asignación de coach a plantillas (feature 009).

## Notas de implementación

<!-- Vacío al crear la tarea. -->
