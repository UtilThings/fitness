# 008 - [Módulo] Shell, navegación, autenticación y errores de ruta

- **Prioridad:** 8
- **Estado:** Pendiente
- **Depende de:** 004, 005, 006, 007
- **Fase:** Fase 3: Migración del texto de la interfaz

## Objetivo

El marco del admin (menú, cabeceras, acceso, páginas de error) está en inglés con traducción al español y reacciona al cambio de idioma.

## Contexto

`layouts/admin-nav.ts` exporta `adminNav` como constante con labels en español; `router/index.ts` usa `meta.title` en español; `lib/permissions.ts` tiene textos; `LoginView`, `ForgotPasswordView`, `NotFoundView`, `ForbiddenView`, `PageHeader`, `EmptyState`, `DataToolbar`, `StatusTag`, `AuthHeading` contienen texto fijo. El borrador de `es.json` ya traduce la navegación principal.

## Alcance

- Convertir `adminNav` en función/`computed` (`navItems()`), con labels marcados con `tl()`/`t()`; actualizar su consumo en `AdminLayout.vue` y `admin-nav.test.ts`.
- `router/index.ts`: `meta.title` en inglés (clave); el título se traduce al mostrarse (004).
- Migrar `layouts/*`, `lib/permissions.ts`, componentes compartidos, vistas de acceso y de error.
- Agregar claves a `es.json`; actualizar pruebas afectadas (`App.test.ts`, `router/index.test.ts`, `shared.test.ts`, `business-brand.test.ts`).

## Criterios de aceptación

- [ ] `cd app && bun run lint`, `bun run typecheck` y `bun run test` pasan en verde.
- [ ] `bun run i18n:check` pasa en verde (sin claves faltantes ni huérfanas).
- [ ] Con `en` el menú, los títulos de página y el acceso aparecen en inglés; con `es`, igual que antes de la feature.
- [ ] Los textos de navegación cambian al instante al cambiar el idioma.

## Referencias

- `app/src/layouts/`, `app/src/router/index.ts`

## Fuera de alcance

- Vistas de módulos (010-018).

## Notas de implementación

