# 020 - [Hooks] Mensajes en inglés del API: identidad, negocio y catálogo

- **Prioridad:** 20
- **Estado:** Completado
- **Depende de:** 019
- **Fase:** Fase 4: Mensajes del API

## Objetivo

Los mensajes de error y las descripciones de auditoría de este grupo de archivos están en inglés, son estáticos y están cubiertos por pruebas.

## Contexto

Archivos del alcance: `hooks/admins.ts`, `businesses.ts`, `business-key.ts`, `tenant.ts`, `catalog.ts`, `catalog-order.ts`, `audit.ts`, `public.ts` y `lib/business*.ts`, `catalog.ts`, `public-*.ts`, `team-guards.ts`, `tenant.ts`, `rules.ts`. Los hooks corren en goja desde `api/pb_hooks/*.pb.js` compilados con `api/src/build.ts`; no se edita `pb_hooks/` a mano. La convención sale del inventario de la tarea 019.

## Alcance

- Reescribir en inglés, siguiendo la convención de 019, los mensajes de `ForbiddenError`, `BadRequestError`, `NotFoundError`, `fieldError` y `ValidationError` de los archivos del alcance; los valores dinámicos pasan a `data` o se eliminan del texto.
- Las descripciones de auditoría nuevas se escriben en inglés y estáticas (los datos variables van en el campo de metadatos).
- No cambiar códigos HTTP, códigos de error ni nombres de campo.
- Actualizar pruebas unitarias del API y las aserciones de `scripts/verify-*.ts` afectadas.
- Registrar en `docs/i18n.md` la lista final de mensajes (insumo de 023).

## Criterios de aceptación

- [x] `cd api && bun test` y `bun run build` pasan en verde; `api/pb_hooks/` regenerado.
- [x] Ningún texto de usuario en español queda en los archivos del alcance (`grep -P '[áéíóúñ¿¡]'` sin coincidencias en cadenas de mensajes).
- [x] Códigos HTTP y `code` de errores sin cambios.
- [x] Los `scripts/verify-*.ts` relacionados terminan en verde.

## Referencias

- `features/021-internacionalizacion-app/spec.md`, «Fase 4».
- https://pocketbase.io/docs/js-event-hooks/

## Fuera de alcance

- Traducción en el app (023); migración de `audit_logs` históricos (fuera de alcance).

## Notas de implementación

Pasaron 123 pruebas del API, la compilación de hooks mediante bun run build:ts y verify-api.sh con una instancia desechable de PocketBase. Las aserciones verifican el resumen estático y el conteo en diff. Se conservan los estados HTTP y códigos de validación.
