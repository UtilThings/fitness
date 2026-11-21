# 009 - [Verificación] Documentación y cierre de reportes

- **Prioridad:** 9
- **Estado:** Pendiente
- **Depende de:** 001, 002, 003, 004, 005, 006, 007, 008
- **Fase:** Fase final: Verificación y cierre

## Objetivo

La feature queda documentada, verificada de extremo a extremo y marcada como completada.

## Contexto

`api/README.md` y `app/README.md` documentan cada módulo (convención del contrato). `scripts/verify-api.sh` y `scripts/verify-app.sh` (005 y 003) corren las comprobaciones del proyecto; la tarea 004 añadió las de permisos de reportes.

## Alcance

- `api/README.md`: sección «Reportes» con rutas, parámetros, definiciones de tasas, matriz de permisos y límites (366 días, `group_by`).
- `app/README.md`: sección «Reportes» (pestañas, permisos, exportación CSV y su protección contra fórmulas, carga diferida de Chart.js).
- Ejecutar `cd api && bun run build:ts && bun test`, `scripts/verify-api.sh` y `scripts/verify-app.sh`; corregir lo que falle dentro del alcance de esta feature.
- Comprobación manual con datos de ejemplo: owner y coach en `/reports`, exportación abierta en Excel o LibreOffice (acentos, celda con `=`).
- Marcar `- **Estado:** Completado` en `spec.md` y cada tarea, y los criterios de aceptación cumplidos.

## Criterios de aceptación

- [ ] Ambos README describen el módulo y coinciden con el contrato implementado.
- [ ] `scripts/verify-api.sh` y `scripts/verify-app.sh` terminan en verde.
- [ ] La comprobación manual con coach confirma que no hay acceso a ingresos ni en UI ni en API.
- [ ] El CSV exportado abre en Excel/LibreOffice con acentos correctos y sin fórmulas ejecutables.
- [ ] El spec y las tareas reflejan el estado real (Completado) y sus notas de implementación.

## Referencias

- `features/017-reportes/spec.md`, sección "Fase final" → tarea 009, y "Validación Post-Deploy".

## Fuera de alcance

- Nuevas funcionalidades de reportes.

## Notas de implementación

