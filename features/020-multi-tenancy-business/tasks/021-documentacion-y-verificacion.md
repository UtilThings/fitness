# 021 - [Docs] Documentación y verificación

- **Prioridad:** 21
- **Estado:** Completado
- **Depende de:** 017, 018, 020
- **Fase:** Fase final: Verificación y cierre

## Objetivo

La alta de un business, la integración de un sitio y las reglas de multi-tenancy están documentadas, y todos los scripts de verificación terminan en verde.

## Contexto

`docs/multi-tenancy.md` tiene el borrador de 001. Los README de `api/`, `app/` y `web/` describen reglas, variables y verificación. `scripts/verify-mvp.sh` encadena la verificación completa.

## Alcance

- `docs/multi-tenancy.md`: modelo, aislamiento (reglas, hooks, `TENANT_COLLECTIONS`), alta de business y primer owner desde /_/, política de moneda/zona/prefijo, rotación de clave, integración de un sitio nuevo (cabecera, orígenes, contrato `version: 2`) y checklist para añadir una colección nueva.
- Actualizar `api/README.md` (reglas con `ruleBusiness`, variables retiradas `STUDIO_*`, `PUBLIC_SITE_ORIGINS`), `app/README.md` (`VITE_APP_NAME`, marca dinámica) y `web/README.md` (`PUBLIC_BUSINESS_KEY`).
- Actualizar `scripts/verify-app.sh`, `verify-web.sh` y `verify-mvp.sh`.
- Recorrer los criterios de aceptación del spec, marcarlos y dejar el estado en «Completado»; registrar hallazgos pendientes sin resolverlos.

## Criterios de aceptación

- [x] `docs/multi-tenancy.md` permite a alguien nuevo dar de alta un business y conectar un sitio sin ayuda.
- [x] Los README no mencionan variables retiradas.
- [x] `scripts/verify-mvp.sh` termina en verde.
- [x] Todos los criterios del spec están marcados y verificados.

## Fuera de alcance

- Nuevas funcionalidades.

## Referencias

- `features/020-multi-tenancy-business/spec.md`, sección "Fase final: Verificación y cierre" → tarea 021.
- `scripts/verify-mvp.sh`

## Notas de implementación

Se documentaron el alta del negocio y su primer owner, la política de moneda y zona, la numeración y la integración pública. Los README reflejan las variables vigentes. `verify-mvp.sh` pasó API, admin y Astro, incluido el verificador de 19 colecciones y los builds con clave válida, rechazada y API caída. Una prueba adicional dio de alta un negocio en PocketBase, abrió su sesión, rotó su clave y compiló el sitio con su nombre y precios en COP. Se verificaron y marcaron los 11 criterios del spec.
