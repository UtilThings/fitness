# 009 - [Verificación] Verificación y cierre de reservas y asistencia

- **Prioridad:** 9
- **Estado:** Pendiente
- **Depende de:** 008
- **Fase:** Fase 4: Verificación y cierre

## Objetivo

La feature 011 queda verificada de punta a punta y lista para marcarse como completada.

## Contexto

`scripts/verify-api.sh` (feature 005) y `scripts/verify-app.sh` son los puntos de control. Esta feature toca datos con efecto sobre cupos, por lo que el recorrido manual es obligatorio.

## Alcance

- Ejecutar ambos scripts y corregir lo que falle.
- Recorrido manual: llenar una sesión, reservar de más (espera), cancelar a tiempo (promoción), cancelar tarde (penalización y excepción), marcar asistencia, cancelar una sesión desde 009 y comprobar `audit_logs`.
- Revisar y marcar los criterios del spec y pasar su estado a Completado.

## Criterios de aceptación

- [ ] `scripts/verify-api.sh` y `scripts/verify-app.sh` terminan en verde.
- [ ] El recorrido de "Validación Post-Deploy" del spec se cumple.
- [ ] Todos los criterios del spec están marcados y el estado es Completado.

## Referencias

- `features/011-reservas-y-asistencia/spec.md`, secciones "Criterios de Aceptación" y "Validación Post-Deploy".

## Fuera de alcance

- Hallazgos nuevos: se anotan en "Notas de implementación" sin resolverlos aquí.

## Notas de implementación

