# 008 - [Rutas] Limpieza de admin-nav y menú por rol

- **Prioridad:** 8
- **Estado:** Pendiente
- **Depende de:** 004, 005
- **Fase:** Fase 4

## Objetivo

El menú de administración no tiene badges falsos ni entradas sin módulo, está agrupado como se acordó y se filtra por rol.

## Contexto

`admin-nav.ts` tiene los grupos Análisis, Operaciones, Ajustes, Facturación con entradas marcador (`/reports`, `/clients`, `/classes`, `/routines`, `/team`, `/plans`, `/payments`, `/subscriptions`) y badges `12` y `70`. Rutas reales hoy: solo `/` (dashboard). Las features posteriores solo activan entradas reales o retiran marcadores que reemplacen.

## Alcance

- Modificar `app/src/layouts/admin-nav.ts`: quitar `badge` de `NavItem`; eliminar `Rutinas` y `Suscripciones`; grupos y entradas: **Análisis** (Dashboard `/`, Reportes `/reports`), **Operaciones** (Clientes `/clients`, Clases `/classes`, Reservas `/bookings`), **Catálogo** (Servicios `/services`, Planes `/plans`), **Ajustes** (Equipo `/team`), **Facturación** (Membresías `/memberships`, Pagos `/payments`).
- Añadir a `NavItem` `roles?: Role[]` y `placeholder?: boolean` (true en todo lo que no sea Dashboard); exportar `visibleNav(role)` que filtra por rol y omite grupos vacíos.
- Modificar `AdminLayout.vue`: usar `visibleNav(role)` y quitar la entrada «Notificaciones» del menú de usuario (queda «Ajustes», que la feature 007 enlaza).
- Actualizar `admin-nav.test.ts`: rutas únicas, grupos no vacíos, sin `badge`, `visibleNav` por rol, y los items no `placeholder` existen como rutas del router.

## Criterios de aceptación

- [ ] El menú muestra los cinco grupos sin números ni entradas de Rutinas o Suscripciones.
- [ ] `visibleNav("coach")` omite lo marcado solo para owner y los grupos que queden vacíos.
- [ ] Todo item sin `placeholder` apunta a una ruta registrada.
- [ ] `bun run typecheck`, `lint`, `test`, `build` pasan.

## Referencias

- `features/006-app-base-de-modulos/spec.md`, sección "Fase 4" → tarea 008.
- `app/src/layouts/AdminLayout.vue`.

## Fuera de alcance

- Retirar marcadores de módulos concretos (cada feature lo hace al entregar su ruta).
- Perfil y equipo (feature 007).

## Notas de implementación

