# 006 - [Composable] `useReports`

- **Prioridad:** 6
- **Estado:** Completado
- **Depende de:** 004, Feature 006 (contrato)
- **Fase:** Fase 3: Exportación y cliente

## Objetivo

Un composable único carga cualquiera de los cuatro reportes con rango, servicio y agrupación reactivos, con presets de fechas calculados en hora del negocio.

## Contexto

`app/src/lib/pocketbase.ts` exporta `pb`; las rutas custom se llaman con `pb.send`. `app/src/lib/datetime.ts` (feature 006) ofrece conversión a `America/New_York` con `Intl`. Las respuestas siguen el contrato del spec. Los errores `403` y `400` deben traducirse a mensajes de interfaz sin exponer detalles técnicos.

## Alcance

- Crear `app/src/composables/useReports.ts` con `useReports<K extends ReportKind>(kind)` que expone `range`, `preset`, `service`, `groupBy`, `data`, `loading`, `error`, `load()` y `setPreset(name)`. Tipos de respuesta en `app/src/types/reports.ts`.
- `load()` usa `pb.send('/api/admin/reports/' + kind, { query, requestKey })`; una petición nueva cancela la anterior y descarta resultados obsoletos.
- Presets: `7d`, `30d` (por defecto), `this-month`, `last-month`, calculados con la fecha local de `America/New_York` (no con la zona del navegador).
- `403` → «No tienes permiso para ver este reporte»; `400` → mensaje del servidor; otros → mensaje genérico.
- Pruebas `useReports.test.ts` con `pb.send` simulado: carga correcta, parámetros enviados, preset en frontera de mes con navegador en otra zona, error `403`, respuesta obsoleta descartada, `loading` vuelve a `false`.

## Criterios de aceptación

- [x] `setPreset('last-month')` produce primer y último día del mes anterior en hora de Miramar, FL.
- [x] Dos llamadas seguidas a `load()` dejan en `data` solo el resultado de la segunda.
- [x] El error `403` produce el mensaje de permisos y `data` queda `null`.
- [x] `bun run test`, `lint`, `format:check` y `typecheck` en `app/` pasan.

## Referencias

- `features/017-reportes/spec.md`, sección "Fase 3" → tarea 006.
- `app/src/lib/pocketbase.ts`, `app/src/lib/datetime.ts`.
- https://github.com/pocketbase/js-sdk#send

## Fuera de alcance

- Gráficos (007), vista (008) y exportación (005).

## Notas de implementación

Los presets se calculan con todayLocal. El composable reutiliza la clave de cancelación de PocketBase y descarta respuestas por revisión. verify-app.sh pasó completo.
