# 008 - [Verificación] Documentación y cierre de la feature

- **Prioridad:** 8
- **Estado:** Pendiente
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

- [ ] Los READMEs describen la feature y las decisiones.
- [ ] `scripts/verify-api.sh` y `scripts/verify-app.sh` terminan en verde.
- [ ] Todos los criterios del spec están marcados o los hallazgos quedan anotados.

## Referencias

- `features/015-agenda-personal-training-y-sesiones-especiales/spec.md`, "Criterios de Aceptación" y "Validación Post-Deploy".

## Fuera de alcance

- Funcionalidad nueva.

## Notas de implementación

<!-- Vacío al crear la tarea. -->
