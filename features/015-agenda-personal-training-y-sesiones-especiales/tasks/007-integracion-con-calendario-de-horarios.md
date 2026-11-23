# 007 - [Vista] Alta de clases especiales y privadas desde el calendario de 009

- **Prioridad:** 7
- **Estado:** Completado
- **Depende de:** 005, 006
- **Fase:** Fase 4: Interfaz

## Objetivo

Desde el calendario de horarios, el staff crea clases especiales y sesiones privadas, y las distingue visualmente de las regulares.

## Contexto

El calendario de 009 y su vista (nombre real por verificar en `app/src/views/admin/` y `components/`) muestran `class_sessions` y permiten crear/cancelar. Las sesiones `private` y `special` no provienen de plantillas y no deben ser regeneradas ni afectadas por la generación semanal de 009.

## Alcance

- Añadir al calendario los botones "Nueva clase especial" (`SpecialSessionDialog`) y "Sesión privada" (`PrivateSessionDialog`), y la creación al pulsar un hueco del calendario con fecha/hora precargadas.
- Distinguir `kind` por color e insignia ("Especial", "Privada") y mostrar `title` en las especiales; permitir editar título/capacidad/coach y cancelar con motivo (`cancel_reason`).
- Filtro por tipo de sesión en el calendario.
- Pruebas Vitest: render de insignias, apertura de diálogos con valores precargados, filtro por tipo.

## Criterios de aceptación

- [x] Se crea una clase especial desde el calendario y aparece con su título e insignia.
- [x] Se crea una sesión privada desde un hueco con fecha/hora precargadas.
- [x] El filtro por tipo oculta y muestra sesiones correctamente.
- [x] La generación de sesiones por plantilla (009) no se ve alterada.
- [x] `bun run test`, `lint`, `format:check`, `typecheck` y `build` pasan.

## Referencias

- `features/015-agenda-personal-training-y-sesiones-especiales/spec.md`, "Fase 4" → tarea 007.
- `features/009-horarios-y-clases` (contrato).

## Fuera de alcance

- Cambios en la generación por plantillas o en `schedule_blocks` (009).

## Notas de implementación

Se integraron los diálogos en `ClassesView.vue`. Cada columna ofrece el próximo hueco de una hora desde las 09:00 locales, y el formulario permite ajustar esa hora. Las pruebas confirman los títulos, las insignias, la edición, el filtro y la creación con fecha y hora precargadas. PocketBase confirma que la generación semanal conserva ambos tipos de sesión.
