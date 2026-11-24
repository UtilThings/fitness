# 017 - [Web] Vista «Negocio»

- **Prioridad:** 17
- **Estado:** Completado
- **Depende de:** 016
- **Fase:** Fase 4: Admin multi-tenant

## Objetivo

El owner edita desde el admin el nombre, logo, ciudad y contacto de su business.

## Contexto

`businesses` permite `update` al owner del propio business solo en campos de marca (002). La navegación se define en `app/src/layouts/admin-nav.ts` (con prueba) y las rutas en `app/src/router/index.ts` con guardas de rol. Las vistas CRUD usan `useCollection`, `PageHeader` y `useNotify`.

## Alcance

- Ruta `/settings/business` (solo owner) y entrada «Negocio» en `admin-nav.ts`.
- `BusinessSettingsView.vue`: formulario con nombre, logo (subir/reemplazar/quitar, vista previa, tipos y tamaño validados), ciudad, teléfono y email; moneda, zona horaria y prefijo de recibo en solo lectura con aviso «los cambia el administrador de la plataforma».
- Al guardar, actualizar `useBusiness` para que el sidebar cambie sin recargar.
- Pruebas de vista, de navegación (`admin-nav.test.ts`) y de guarda de rol.

## Criterios de aceptación

- [x] El owner cambia el nombre y el logo y el sidebar se actualiza sin recargar.
- [x] Coach y reception no ven la entrada ni acceden a la ruta.
- [x] Un archivo no imagen o de más de 2 MB se rechaza con mensaje claro.
- [x] Moneda, zona y prefijo no son editables.
- [x] `bun run lint`, `bun run test`, `bun run build` y `vue-tsc` pasan en verde.

## Fuera de alcance

- Clave pública y orígenes (018).

## Referencias

- `features/020-multi-tenancy-business/spec.md`, sección "Fase 4: Admin multi-tenant" → tarea 017.
- `app/src/layouts/admin-nav.ts`, `app/src/router/index.ts`

## Notas de implementación

La vista guarda nombre, ciudad y contacto y admite cargar, sustituir y quitar el logo. El cambio actualiza el estado compartido de la marca. La prueba REST cargó un PNG, leyó sus bytes sin sesión y lo quitó. Las pruebas de vista cubren tipo y tamaño, y las guardas y el menú limitan el acceso al owner. `verify-app.sh` pasó con lint, formato, tipos, pruebas y build.
