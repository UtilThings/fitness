# 006 - [Vista] Pestaña Coaching en el perfil del cliente

- **Prioridad:** 6
- **Estado:** Completado
- **Depende de:** 004
- **Fase:** Fase 4: Interfaz

## Objetivo

Desde el perfil de un cliente se ve su programa de coaching, su historial de check-ins y se pueden registrar nuevos.

## Contexto

El perfil del cliente (010) usa pestañas y 013/014 añaden las suyas; verificar el nombre real de la vista y cómo se registran pestañas. La pestaña solo debe aparecer si el cliente tiene o tuvo un programa, o si tiene una membresía de servicio `online`; si no, ofrece "Crear programa".

## Alcance

- Añadir la pestaña "Coaching": tarjeta del programa vivo (coach, semana X de N, estado, renovación, enlace del plan, objetivo), adherencia promedio con tendencia, `CheckinTimeline`, botón "Registrar check-in" (coach del programa y owner) y listado de programas anteriores.
- Reutilizar `ProgramFormDialog` y `CheckinDialog` de 004.
- Pruebas Vitest: render con y sin programa, visibilidad de acciones por rol, programas terminados.

## Criterios de aceptación

- [x] El perfil muestra el programa activo con su historial y permite registrar un check-in.
- [x] Sin programa ni membresía online no se muestra la pestaña; con membresía online sin programa aparece "Crear programa".
- [x] Reception ve la pestaña en solo lectura.
- [x] `bun run test`, `lint`, `format:check`, `typecheck` y `build` pasan.

## Referencias

- `features/016-online-coaching/spec.md`, "Fase 4" → tarea 006.

## Fuera de alcance

- Vista global `/coaching` (005); portal del cliente.

## Notas de implementación

La pestaña se actualiza al cambiar una membresía desde el perfil. Conserva el historial si solo quedan programas finalizados o una membresía online vencida. El alta desde el perfil exige una membresía activa y el rol owner o coach; reception consulta el historial.
