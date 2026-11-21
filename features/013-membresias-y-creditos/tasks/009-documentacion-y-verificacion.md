# 009 - [Verificación] Documentación y cierre de la feature

- **Prioridad:** 9
- **Estado:** Pendiente
- **Depende de:** 006, 008
- **Fase:** Fase final: Verificación y cierre

## Objetivo

La feature queda documentada, verificada de extremo a extremo y marcada como completada.

## Contexto

`api/README.md` y `app/README.md` documentan cada módulo; `scripts/verify-api.sh` y `scripts/verify-app.sh` (feature 005) agrupan las comprobaciones. Las tareas 004-006 ya añadieron casos al script de API.

## Alcance

- `api/README.md`: sección "Membresías y créditos" (colecciones, rutas, reglas de dominio, decisiones de bloqueo/override, cron, extensión para 014/015/016).
- `app/README.md`: sección con vistas, composable y componentes.
- Revisar que `scripts/verify-api.sh` cubra asignar, renovar, ajustar, reserva sin créditos con y sin override, y `run-daily`.
- Ejecutar `scripts/verify-api.sh` y `scripts/verify-app.sh`; marcar los criterios de aceptación y cambiar `Estado` del spec a Completado.

## Criterios de aceptación

- [ ] Ambos READMEs describen la feature y las decisiones tomadas.
- [ ] `scripts/verify-api.sh` y `scripts/verify-app.sh` terminan en verde.
- [ ] Todos los criterios del spec están marcados o quedan hallazgos anotados.

## Referencias

- `features/013-membresias-y-creditos/spec.md`, "Criterios de Aceptación" y "Validación Post-Deploy".

## Fuera de alcance

- Cualquier funcionalidad nueva.

## Notas de implementación

<!-- Vacío al crear la tarea. -->
