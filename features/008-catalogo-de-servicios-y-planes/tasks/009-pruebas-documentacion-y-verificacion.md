# 009 - [Verificación] Pruebas de integración, documentación y cierre

- **Prioridad:** 9
- **Estado:** Pendiente
- **Depende de:** 004, 005, 007, 008
- **Fase:** Fase final: Verificación y cierre

## Objetivo

La feature queda documentada y verificada de extremo a extremo con los scripts del proyecto en verde.

## Contexto

La feature 005 deja `scripts/verify-api.sh` y `bun test` en `api/`; `scripts/verify-app.sh` ya existe y corre `test`, `lint`, `format:check`, `typecheck` y `build`. Hay que comprobar las reglas contra una instancia real de PocketBase (migraciones, seed, hooks y reglas), porque `bun test` solo cubre la lógica pura.

## Alcance

- Ampliar `scripts/verify-api.sh` (o un script auxiliar que este llame) con comprobaciones contra PocketBase en un directorio temporal de datos: 5 servicios y 10 planes tras el arranque; reinicio sin duplicados; `coach` no puede crear; segundo `is_first_class` → 400; `price_cents` negativo → 400; borrar servicio con planes → 400; desactivar servicio desactiva planes.
- Documentar en `api/README.md` la sección «Catálogo»: colecciones, reglas, seed idempotente, hooks y cómo editar los datos; en `app/README.md` las vistas `/services` y `/plans`.
- Revisar que `admin-nav.ts` no conserve marcadores de Planes y que no se hayan añadido badges falsos.
- Marcar la feature como `Completado` en `spec.md` y las tareas con sus criterios y "Notas de implementación".
- Límites: sin funcionalidad nueva.

## Criterios de aceptación

- [ ] `scripts/verify-api.sh` termina en verde con las comprobaciones del catálogo.
- [ ] `scripts/verify-app.sh` termina en verde.
- [ ] Las secciones de documentación existen y los comandos descritos funcionan.
- [ ] Todos los criterios de aceptación de `features/008-catalogo-de-servicios-y-planes/spec.md` están marcados o justificados.

## Referencias

- `features/008-catalogo-de-servicios-y-planes/spec.md`, "Validación Post-Deploy".
- `scripts/verify-app.sh`, `scripts/verify-api.sh`.

## Fuera de alcance

- Horarios (feature 009) y publicación del catálogo en `web/` (019).

## Notas de implementación

<!-- Vacío al crear la tarea. -->
