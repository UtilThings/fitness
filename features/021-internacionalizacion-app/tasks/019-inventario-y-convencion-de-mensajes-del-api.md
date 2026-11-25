# 019 - [Docs] Inventario y convención de mensajes del API

- **Prioridad:** 19
- **Estado:** Completado
- **Depende de:** Ninguna
- **Fase:** Fase 4: Mensajes del API

## Objetivo

Se conoce el universo de mensajes de usuario del API y hay una convención clara (estático, inglés, `data` para valores) antes de editarlos.

## Contexto

`api/src/hooks/*.ts` (~21 archivos) y `api/src/lib/*.ts` contienen ~110 `ForbiddenError`, `BadRequestError`, `NotFoundError` y `fieldError(campo, mensaje)` con texto en español, algunos con interpolación (p. ej. `"Sesiones generadas: " + created` en auditoría). `app/src/lib/pb-errors.ts` muestra `response.message`. Los códigos de `ValidationError` (`validation_client`, …) ya existen y no cambian.

## Alcance

- Generar el inventario con `grep` de `Error("`, `fieldError(` y descripciones de auditoría; registrarlo por archivo en `docs/i18n.md` (sección «Mensajes del API») con columnas: archivo, mensaje actual, propuesta en inglés, ¿interpola?
- Decidir y documentar para cada mensaje dinámico: reescribir estático, o enviar el valor en `data` y mantener el texto estático.
- Fijar reglas de redacción: inglés, oración completa terminada en punto, sin valores dentro del texto, sin nombres de campo técnicos.
- No modifica código del API.

## Criterios de aceptación

- [x] El inventario cubre todos los archivos de `api/src/hooks` y `api/src/lib` con mensajes de usuario.
- [x] Cada mensaje dinámico tiene una decisión registrada.
- [x] No quedan cambios en código; solo `docs/i18n.md`.

## Referencias

- `api/src/hooks/`, `api/src/lib/`

## Fuera de alcance

- Edición de mensajes (020-022); catálogo en el app (023).

## Notas de implementación

Inventario por archivo completado en docs/i18n.md. Las entradas dinámicas incluyen la decisión de retirar la interpolación o conservar los valores en datos estructurados. El diff de producto contiene únicamente documentación.
