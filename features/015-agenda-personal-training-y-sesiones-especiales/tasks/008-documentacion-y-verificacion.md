# 008 - [Verificación] Documentación y cierre de la feature

- **Prioridad:** 8
- **Estado:** Completado
- **Depende de:** 004, 007
- **Fase:** Fase final: Verificación y cierre

## Objetivo

La feature queda documentada, verificada de extremo a extremo y marcada como completada.

## Contexto

`api/README.md`, `app/README.md` y los scripts `scripts/verify-api.sh` y `scripts/verify-app.sh` (feature 005) agrupan documentación y comprobaciones; las tareas 003 y 004 ya añadieron casos de API.

## Alcance

- `api/README.md`: sección "Agenda de Personal Training y sesiones especiales" (colección, reglas de choque/disponibilidad/capacidad, ruta de sesión privada, decisiones sobre créditos y especiales).
- `app/README.md`: vistas `/agenda` y `/agenda/disponibilidad`, componentes y cambios al calendario.
- Revisar que `scripts/verify-api.sh` cubra disponibilidad, choques, privada con uno y dos clientes y especial.
- Ejecutar ambos scripts de verificación; marcar criterios y poner `Estado: Completado` en el spec.

## Criterios de aceptación

- [x] Los READMEs describen la feature y las decisiones.
- [x] `scripts/verify-api.sh` y `scripts/verify-app.sh` terminan en verde.
- [x] Todos los criterios del spec están marcados o los hallazgos quedan anotados.

## Referencias

- `features/015-agenda-personal-training-y-sesiones-especiales/spec.md`, "Criterios de Aceptación" y "Validación Post-Deploy".

## Fuera de alcance

- Funcionalidad nueva.

## Notas de implementación

`scripts/verify-api.sh` completó 71 pruebas unitarias y la prueba de humo contra PocketBase. Se comprobó que las sesiones previas sobreviven a la reversión y reaplicación de las migraciones. Los casos de agenda verifican que los choques, la falta de disponibilidad y el segundo cliente sin créditos no dejan registros parciales. También cubren el cupo partner, la baja de un coach, el cambio de hora, el consumo al asistir a una privada y la asistencia a una especial sin membresía ni movimientos de crédito.

`scripts/verify-app.sh` completó lint, formato, typecheck, 270 pruebas Vitest y build. Vitest cubre el editor semanal, los permisos de agenda, la agrupación local cerca de medianoche y los flujos de creación y filtrado del calendario.
