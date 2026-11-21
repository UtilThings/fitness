# 005 - [Vista] Lista de clientes con búsqueda, filtros y alta manual

- **Prioridad:** 5
- **Estado:** Pendiente
- **Depende de:** 004, Feature 008 (contrato)
- **Fase:** Fase 2: Interfaz de clientes

## Objetivo

El personal ve la lista de clientes, busca por nombre, email o teléfono, filtra por estado y da de alta un cliente manualmente.

## Contexto

`app/src/views/admin/` solo contiene `DashboardView.vue`. La ruta y la entrada de navegación se añaden en la tarea 006. La feature 008 define servicios y planes, pero la relación cliente-plan activo llega con 013: aquí solo se reservan los controles.

## Alcance

- Crear `app/src/views/admin/ClientsView.vue`: `DataTable` paginado en el servidor con columnas nombre, email, teléfono, estado (`ClientStatusTag`), marca de clase gratis y fecha de alta; clic en una fila navega a `/clients/:id`.
- Búsqueda con debounce de 300 ms y filtro de estado (Todos, Activo, Pausado, Inactivo; por defecto Activo); el estado de búsqueda se sincroniza con la query de la URL.
- Filtros «Servicio» y «Plan activo» deshabilitados con el texto «Disponible con Membresías» (placeholders que completa la feature 013).
- Botón «Nuevo cliente» → diálogo con `ClientForm`; al guardar navega al perfil.
- Estados vacío y de carga.

## Criterios de aceptación

- [ ] Buscar «ana», un email parcial y un teléfono parcial devuelve los clientes esperados.
- [ ] Cambiar el filtro de estado refresca la lista y conserva la búsqueda.
- [ ] Los placeholders de servicio y plan están visibles pero deshabilitados.
- [ ] El alta manual crea el cliente y muestra errores de email/teléfono inválidos o duplicados.
- [ ] `typecheck`, `lint`, `format:check` y `test` pasan.

## Referencias

- `features/010-clientes/spec.md`, sección "Fase 2" → tarea 005.
- `app/src/composables/useClients.ts` (tarea 004).
- https://primevue.org/datatable/#lazy

## Fuera de alcance

- Perfil del cliente y rutas (006); filtros reales por servicio y plan (013).

## Notas de implementación

