# 009 - [Verificación] Documentación, verify-api/verify-app y cierre

- **Prioridad:** 9
- **Estado:** Completado
- **Depende de:** 001, 002, 003, 004, 005, 006, 007, 008
- **Fase:** Fase final

## Objetivo

El equipo está documentado, ambos scripts de verificación pasan en verde y la feature queda cerrada.

## Contexto

`api/README.md` y `app/README.md` documentan la base (features 005 y 006). `scripts/verify-api.sh` y `scripts/verify-app.sh` validan cada proyecto.

## Alcance

- Actualizar `api/README.md`: sección «Equipo: reglas y `ADMIN_REFERENCES`» (reglas de último owner y borrado, cómo añadir una relación a `admins` en cada feature).
- Actualizar `app/README.md`: sección «Equipo y perfil» (vistas, permisos, `useTeam().coaches` para selectores).
- Ejecutar `scripts/verify-api.sh` y `scripts/verify-app.sh`; corregir lo que falle.
- Recorrer los criterios de aceptación del spec con datos reales y marcar la feature como `Completado`.

## Criterios de aceptación

- [x] Ambos scripts de verificación terminan en verde.
- [x] Los README describen cómo añadir una referencia a `admins` y cómo reutilizar `useTeam().coaches`.
- [x] Todas las tareas 001-008 figuran como `Completado`.

## Referencias

- `features/007-equipo-y-coaches/spec.md`, sección "Fase final" → tarea 009.
- `scripts/verify-api.sh`, `scripts/verify-app.sh`.

## Fuera de alcance

- Verificación de features posteriores.

## Notas de implementación

Verificado con Edge, Vite y PocketBase 0.40.5 sobre bases temporales. El recorrido probó alta, permisos por rol, búsqueda y filtros, cambio de rol, foto y datos de perfil, contraseña incorrecta y reautenticación, baja con historial y auditoría. Las pruebas HTTP confirmaron los rechazos 403, la protección del último owner, una baja sin referencias y la conservación de un owner ante cambios simultáneos. verify-api.sh pasó con 26 pruebas y verificación HTTP. verify-app.sh pasó con 105 pruebas y compilación de producción.
