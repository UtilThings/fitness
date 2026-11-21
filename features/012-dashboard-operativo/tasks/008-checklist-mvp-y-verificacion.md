# 008 - [Verificación] Checklist de aceptación del MVP y script de verificación

- **Prioridad:** 8
- **Estado:** Pendiente
- **Depende de:** 007
- **Fase:** Fase 4: Pruebas y cierre del MVP

## Objetivo

El MVP completo (features 005-012) queda verificado con una checklist documentada y un script que lo comprueba de forma repetible.

## Contexto

`scripts/verify-app.sh` existe; `scripts/verify-api.sh` lo crea la feature 005. Cada feature del MVP cerró con su propia verificación; esta tarea comprueba la integración y marca el cierre. Las features 013-019 (v2) no forman parte de este cierre.

## Alcance

- Crear `scripts/verify-mvp.sh` (`set -euo pipefail`, mismo estilo que `verify-app.sh`): ejecuta `verify-api.sh` y `verify-app.sh`; comprueba que existan las migraciones esperadas (colecciones `audit_logs`, `services`, `plans`, `class_templates`, `class_sessions`, `schedule_blocks`, `clients`, `bookings`) y los hooks compilados (`bookings.pb.js`, `dashboard.pb.js`, `clients.pb.js`); comprueba que `admins.createRule` ya no es abierto (`""`) y que no queda el hook de ejemplo con `businesses`.
- Añadir la sección «Aceptación del MVP» (en `app/README.md` o `api/README.md`) con el recorrido completo por rol: owner crea un coach y servicio con planes, genera horarios, da de alta un cliente, reserva (cupo, espera, cancelación a tiempo y tardía), marca asistencia, ve el dashboard y la auditoría; coach y recepción ven solo lo permitido.
- Recorrer la checklist con datos reales de desarrollo, corregir lo que falle y dejar los hallazgos pendientes anotados.
- Marcar las features 005-012 como completadas (estado del spec y de sus tareas) tras verificar sus criterios.

## Criterios de aceptación

- [ ] `scripts/verify-mvp.sh` termina en verde.
- [ ] La checklist de aceptación del MVP está documentada y recorrida sin bloqueos.
- [ ] No quedan colecciones con reglas abiertas (`""`) sin intención explícita ni referencias a `businesses`.
- [ ] Todos los criterios del spec de 012 están marcados y su estado es Completado.

## Referencias

- `features/012-dashboard-operativo/spec.md`, secciones "Criterios de Aceptación" y "Validación Post-Deploy".
- `scripts/verify-app.sh`

## Fuera de alcance

- Funcionalidades v2 (013-019); correcciones grandes descubiertas en el cierre se registran como hallazgos pendientes.

## Notas de implementación

