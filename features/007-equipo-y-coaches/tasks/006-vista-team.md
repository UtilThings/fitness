# 006 - [Vista] Listado de equipo (TeamView)

- **Prioridad:** 6
- **Estado:** Completado
- **Depende de:** 004, 005
- **Fase:** Fase 3

## Objetivo

En `/team` el equipo se lista, filtra, y un owner puede dar de alta, cambiar rol, desactivar o eliminar integrantes.

## Contexto

Se usan `PageHeader`, `DataToolbar`, `StatusTag`, `EmptyState` y `useConfirmDelete` (006), `useTeam` (tarea 004) y `can("team.manage")` para mostrar acciones. La API ya impide lo no permitido; la vista solo debe ocultar y mostrar mensajes.

## Alcance

- Crear `app/src/views/admin/TeamView.vue`: cabecera con botón «Nuevo integrante» (solo `can("team.manage")`), `DataToolbar` con búsqueda por nombre/correo y filtros por rol y estado (activos/inactivos), `DataTable` con avatar, nombre, correo, rol, estado y acciones (ver ficha, activar/desactivar, eliminar).
- Eliminar usa `useConfirmDelete`; si `deleteOrDeactivate` devuelve `needsDeactivate`, mostrar confirmación «Tiene registros; ¿desactivar en su lugar?» y llamar a `setActive`.
- Diálogo de alta con `MemberForm` (contraseña inicial con «Generar» y aviso de que debe comunicarse en persona); éxito con `useNotify`.
- `EmptyState` cuando no hay resultados; roles sin permiso ven la lista sin columna de acciones.
- Pruebas de la vista con `useTeam` mockeado: botón oculto sin permiso, filtros, flujo de 409 → desactivar.

## Criterios de aceptación

- [x] Un owner ve «Nuevo integrante» y las acciones; un coach no.
- [x] Buscar por nombre o correo y filtrar por rol y estado actualiza la lista.
- [x] Eliminar un admin con registros ofrece desactivar y, al aceptar, queda inactivo.
- [x] Los errores de la API (por ejemplo último owner) se muestran como aviso legible.
- [x] `bun run typecheck`, `lint`, `test`, `build` pasan.

## Referencias

- `features/007-equipo-y-coaches/spec.md`, sección "Fase 3" → tarea 006.
- https://primevue.org/datatable/

## Fuera de alcance

- Ficha y perfil (tarea 007); registro de la ruta (tarea 008).

## Notas de implementación

