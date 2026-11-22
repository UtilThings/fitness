# 008 - [Verificación] Verificación y cierre de clientes

- **Prioridad:** 8
- **Estado:** Completado
- **Depende de:** 007
- **Fase:** Fase 3: Verificación y cierre

## Objetivo

La feature 010 queda verificada de punta a punta y lista para marcarse como completada.

## Contexto

`scripts/verify-api.sh` (feature 005) y `scripts/verify-app.sh` (existente: install, lint, format:check, typecheck, test, build) son los puntos de control del repositorio.

## Alcance

- Ejecutar `scripts/verify-api.sh` y `scripts/verify-app.sh` y corregir lo que falle.
- Recorrido manual con PocketBase y app en local: alta, duplicado, búsqueda, cambio de estado, evaluación, permisos de la clase gratis, borrado bloqueado, auditoría visible en `audit_logs`.
- Revisar los criterios de aceptación del spec y marcarlos; actualizar el estado del spec a Completado.

## Criterios de aceptación

- [x] Ambos scripts de verificación terminan en verde.
- [x] El recorrido manual de "Validación Post-Deploy" del spec se cumple.
- [x] Todos los criterios del spec están marcados y el estado del spec es Completado.

## Referencias

- `features/010-clientes/spec.md`, secciones "Criterios de Aceptación" y "Validación Post-Deploy".
- `scripts/verify-app.sh`

## Fuera de alcance

- Nuevas funcionalidades; hallazgos pendientes se registran en "Notas de implementación" sin resolverlos aquí.

## Notas de implementación


Pasaron scripts/verify-api.sh, scripts/verify-app.sh y el recorrido en Chromium con la compilación de producción. En PocketBase 0.40.5 se comprobaron los códigos 400, 403 y 409, el cambio de clase gratis con app.save interno, la inactivación con historial, el borrado sin historial y la auditoría. Se revisaron y marcaron los diez criterios de la especificación.
