# 011 - [Módulo] Zona horaria en reportes, dashboard, mensajes y crons por business

- **Prioridad:** 11
- **Estado:** Completado
- **Depende de:** 007, 009, 010
- **Fase:** Fase 2: Zona horaria, moneda y mensajes por business

## Objetivo

Reportes, dashboard, mensajes y crons calculan por business y con su zona; los crons recorren los business activos.

## Contexto

`reports-range.ts`, `reports-store.ts`, `dashboard.ts` (las rutas devuelven `timezone` fija), `message-policy.ts`, `message-render.ts`, `message-triggers.ts` y `hooks/memberships-cron.ts` / `hooks/messages-triggers.ts` operan hoy sobre todos los registros.

## Alcance

- Rutas `/api/admin/dashboard` y `/api/admin/reports*`: filtrar siempre por el business del usuario y devolver su `timezone`.
- Crons: iterar `businesses` con `active = true` y ejecutar la lógica con el `business` y la zona de cada uno; un fallo en un business no detiene a los demás (se registra y continúa).
- Eliminar `DEFAULT_TIMEZONE` de `tz.ts` cuando ya no haya llamadas sin zona.
- Pruebas: `dashboard.test.ts`, `reports-*.test.ts`, `message-policy.test.ts` con una zona distinta; prueba del iterador de crons con un business fallido.

## Criterios de aceptación

- [x] El dashboard y los reportes de un business no incluyen datos de otro.
- [x] «Hoy» y los rangos de reportes se calculan en la zona del business.
- [x] Un cron procesa cada business activo con su zona; un business inactivo se omite.
- [x] No queda ninguna referencia a `DEFAULT_TIMEZONE`.
- [x] `bun run build:ts` y `bun test` pasan en verde.

## Fuera de alcance

- Moneda y recibos (012); datos de contacto en mensajes (013).

## Referencias

- `features/020-multi-tenancy-business/spec.md`, sección "Fase 2: Zona horaria, moneda y mensajes por business" → tarea 011.
- `api/src/hooks/memberships-cron.ts`, `api/src/hooks/messages-triggers.ts`

## Notas de implementación

Dashboard y los cuatro reportes se probaron por REST con dos negocios; los conteos, servicios y zonas correspondieron al negocio autenticado. Las pruebas incluyen límites de día en Bogotá, avisos a las 09:00 locales y continuación del cron después del fallo de un negocio. El iterador omite negocios inactivos. Se retiró `DEFAULT_TIMEZONE`; la API pública v1 se acotó temporalmente al negocio inicial hasta 015. Build y 116 pruebas en verde.
