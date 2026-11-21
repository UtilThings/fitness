# 007 - [Verificación] Documentación y cierre de la feature

- **Prioridad:** 7
- **Estado:** Pendiente
- **Depende de:** 005, 006
- **Fase:** Fase final: Verificación y cierre

## Objetivo

La feature queda documentada (incluido lo que queda para "Después"), verificada de extremo a extremo y marcada como completada.

## Contexto

`api/README.md`, `app/README.md` y los scripts `scripts/verify-api.sh` y `scripts/verify-app.sh` (feature 005) agrupan documentación y comprobaciones; la tarea 003 ya añadió casos de API.

## Alcance

- `api/README.md`: sección "Online Coaching" (colecciones, reglas, sincronización con membresías) y subsección "Después": entrega de planes de entrenamiento y nutrición, portal del cliente, fotos y medidas de progreso.
- `app/README.md`: vista `/coaching`, pestaña del perfil y componentes.
- Revisar que `scripts/verify-api.sh` cubra alta válida e inválida, check-ins y sincronización.
- Ejecutar ambos scripts de verificación; marcar criterios y poner `Estado: Completado` en el spec.

## Criterios de aceptación

- [ ] Los READMEs describen la feature y lo que queda para "Después".
- [ ] `scripts/verify-api.sh` y `scripts/verify-app.sh` terminan en verde.
- [ ] Todos los criterios del spec están marcados o los hallazgos quedan anotados.

## Referencias

- `features/016-online-coaching/spec.md`, "Criterios de Aceptación" y "Validación Post-Deploy".

## Fuera de alcance

- Funcionalidad nueva.

## Notas de implementación

<!-- Vacío al crear la tarea. -->
