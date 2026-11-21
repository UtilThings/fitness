# 009 - [Verificación] Pruebas de integración, documentación y cierre

- **Prioridad:** 9
- **Estado:** Pendiente
- **Depende de:** 002, 005, 007, 008
- **Fase:** Fase final: Verificación y cierre

## Objetivo

La feature queda verificada contra una instancia real de PocketBase, documentada (incluido el evento de cancelación) y con los scripts de verificación en verde.

## Contexto

`bun test` solo cubre lógica pura; migraciones, índice único parcial, hooks, rutas y cron requieren una instancia real. La feature 005 aporta `scripts/verify-api.sh`; `scripts/verify-app.sh` corre `test`, `lint`, `format:check`, `typecheck` y `build`. Las features 011 y 018 dependen del contrato documentado aquí.

## Alcance

- Ampliar `scripts/verify-api.sh` (o un script que este invoque) con comprobaciones contra PocketBase en un directorio de datos temporal: 9 plantillas tras el seed; `generate` crea 36 y luego 0; sesión duplicada rechazada por el índice; cancelar sin motivo → 400 y con motivo OK; segunda cancelación → 400; `move` crea la `special` y la regeneración no recrea la original; bloqueo cancela sesiones del día y no se regeneran; `coach` → 403 en `generate`; `reception` puede cancelar.
- Documentar en `api/README.md` la sección «Horarios y clases»: colecciones, rutas y errores, cron, reglas DST, convención de fechas (UTC y fechas locales) y **el evento de cancelación** con un ejemplo de `onRecordAfterUpdateSuccess("class_sessions")` usando `isCancellationTransition` para las features 011 y 018; en `app/README.md` las vistas de clases.
- Confirmar que `admin-nav.ts` ya no tiene el badge `70` ni marcadores de clases.
- Marcar la feature `Completado` en `spec.md` y las tareas con criterios y notas.
- Límites: sin funcionalidad nueva.

## Criterios de aceptación

- [ ] `scripts/verify-api.sh` termina en verde con las comprobaciones de horarios.
- [ ] `scripts/verify-app.sh` termina en verde.
- [ ] `api/README.md` documenta el evento de cancelación con ejemplo ejecutable y las rutas con sus errores.
- [ ] Los criterios de aceptación de `features/009-horarios-y-clases/spec.md` están marcados o justificados.

## Referencias

- `features/009-horarios-y-clases/spec.md`, "Validación Post-Deploy".
- `scripts/verify-app.sh`, `scripts/verify-api.sh`.

## Fuera de alcance

- Reservas (011), notificaciones (018) y catálogo público (019).

## Notas de implementación

<!-- Vacío al crear la tarea. -->
