# 005 - [Web] AdminLayout con barra lateral

- **Prioridad:** 5
- **Estado:** Completado
- **Depende de:** 001, 002
- **Fase:** Fase 3

## Objetivo

Las rutas protegidas se muestran en un layout con barra lateral flotante, cabecera y menú de usuario, responsive, similar a la referencia.

## Contexto

PrimeVue 5 incluye `SidebarLayout`, `Sidebar`, `SidebarAside`, `SidebarPanel`, `SidebarHeader`, `SidebarContent`, `SidebarFooter`, `SidebarGroup*`, `SidebarMenu*`, `SidebarTrigger`, `SidebarBackdrop`, `SidebarMain` y `SidebarSpacer`. No detecta móvil: se usa `overlay` y `collapsible="offcanvas"`. Comprobar las props en `node_modules/primevue/sidebar*` antes de montar.

## Alcance

- `src/composables/useMediaQuery.ts`: `useMediaQuery(query)` → `Ref<boolean>` con `matchMedia` y limpieza en `onScopeDispose`.
- `src/layouts/admin-nav.ts`: tipos `NavItem` (`label`, `icon`, `to`, `badge?`) y `NavGroup` (`label`, `items`); grupos Análisis, Operaciones, Ajustes y Facturación con entradas de ejemplo.
- `src/layouts/AdminLayout.vue`: `SidebarLayout` > `Sidebar` (`variant="floating"`; escritorio `collapsible="icon"` abierta; móvil `overlay`, `offcanvas`, cerrada) con `SidebarSpacer`, `SidebarAside`, `SidebarPanel`; `SidebarHeader` con logo y nombre; `SidebarContent` con los grupos (`SidebarMenuButton` como `RouterLink`, `isActive` por ruta, `SidebarMenuBadge`); `SidebarFooter` con botón de usuario (`Avatar` con iniciales, nombre/correo, chevron) que abre un `Menu` emergente (correo, Ajustes, Notificaciones, Cerrar sesión).
- `SidebarMain` con cabecera (`SidebarTrigger`, título `route.meta.title`) y `<RouterView />`; `SidebarBackdrop` solo en móvil; cerrar el panel al navegar en móvil.
- Cerrar sesión: `logout()` y navegar a `login`.

## Criterios de aceptación

- [x] Escritorio: la barra flotante se colapsa a iconos con el botón de cabecera.
- [x] Móvil (<768 px): panel superpuesto con fondo oscurecido; se cierra al pulsar fuera o al navegar.
- [x] La entrada activa se resalta y los badges se muestran.
- [x] «Cerrar sesión» lleva a `/login`.
- [x] `bun run typecheck`, `lint`, `format:check` y `build` pasan.

## Referencias

- `features/004-app-layouts-auth-admin/spec.md`, sección "Fase 3" → tarea 005.
- https://primevue.org/menu/
- Capturas de referencia aportadas por el usuario.

## Fuera de alcance

- Módulos de negocio, ajustes y notificaciones reales (las entradas son marcadores).

## Notas de implementación

Props comprobadas en `node_modules/primevue/sidebar*`. `SidebarTrigger` usa `Button` por defecto, por lo que se le pasan `icon`, `severity="secondary"` y `variant="text"`. En colapsado se oculta nombre y chevrón con `in-data-[collapsible=icon]:hidden`. Verificado con capturas (escritorio, colapsado, móvil abierto, menú de usuario). Las entradas de menú salvo Dashboard no tienen ruta (marcadores → 404).
