# 008 - [Vista] Planes: tabla, formulario, activación y orden

- **Prioridad:** 8
- **Estado:** Pendiente
- **Depende de:** 006, 007
- **Fase:** Fase 3: Interfaz

## Objetivo

El owner gestiona los planes y precios desde `/plans`, filtrando por servicio, con validaciones consistentes con el servidor.

## Contexto

`admin-nav.ts` mantiene un marcador «Planes» (`/plans`) sin vista; esta tarea lo reemplaza por la entrada real. Los planes se muestran con el servicio expandido. El hook (tarea 005) rechaza más de una `is_first_class`, precios inválidos y activar bajo un servicio inactivo; la UI debe mostrar esos errores por campo.

## Alcance

- Crear `app/src/views/admin/PlansView.vue`: `DataTable` con filtro por servicio (`Select`), columnas servicio, nombre, precio (`formatCents`), unidad, sesiones, frecuencia, compromiso («4 periodos = 16 semanas»), marcas `Tag` «Primera clase» y «Partner», estado y orden (subir/bajar dentro del servicio).
- Diálogo de alta/edición: `service`, `name`, `price` (entrada en dólares convertida a `price_cents`), `billing_unit`, `sessions`, `per_week`, `commitment_periods`, `is_first_class`, `partner`, `note`; al marcar `is_first_class` se fuerza precio 0 y unidad `first_visit`; si el servicio está inactivo el interruptor «Activo» queda deshabilitado con explicación.
- Modificar `app/src/router/index.ts` (ruta `plans`, `meta.title: 'Planes'`) y `admin-nav.ts` (quitar el marcador, entrada real; sin badge).
- Solo lectura para roles distintos de `owner`.
- Pruebas Vitest con composables simulados: filtrado por servicio, conversión dólares↔centavos, error de segunda primera clase, activación deshabilitada con servicio inactivo.

## Criterios de aceptación

- [ ] `/plans` muestra los 10 planes con precios correctos (p. ej. `$1,447` para Partner 3x).
- [ ] Editar un precio persiste en centavos; precio negativo se rechaza.
- [ ] Marcar un segundo plan como primera clase muestra el error del servidor en el formulario.
- [ ] No se puede activar un plan bajo un servicio inactivo.
- [ ] El filtro por servicio y el orden funcionan y persisten tras recargar.
- [ ] `bun run test`, `typecheck`, `lint`, `format:check` y `build` pasan.

## Referencias

- `features/008-catalogo-de-servicios-y-planes/spec.md`, "Fase 3" → tarea 008.
- `app/src/views/admin/ServicesView.vue` (patrón de la tarea 007).

## Fuera de alcance

- Contratación de planes por clientes (feature 013) y pagos (014).

## Notas de implementación

<!-- Vacío al crear la tarea. -->
