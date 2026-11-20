# 008 - [Docs] Documentación y script de verificación

- **Prioridad:** 8
- **Estado:** Completado
- **Depende de:** 001, 002, 003, 004, 005, 006, 007
- **Fase:** Fase final: Verificación y cierre

## Objetivo

Cualquier persona puede levantar, probar y compilar el frontend siguiendo el README, y un script único valida todo el boilerplate.

## Contexto

Con las tareas 001-007 completas existen todos los scripts de `bun`. Documentar lo que realmente existe, verificándolo con `ls` y `package.json`.

## Alcance

- Crear `web/README.md` en español: requisitos (Bun y Node según `.nvmrc`; Astro corre sobre Node), instalación con `bun install`, advertencia de usar `bun run test` y no `bun test`, `.env`, tabla de scripts, estructura de carpetas, convenciones (alias `@/`, `PUBLIC_*`, `<script setup lang="ts">`) y cómo agregar una página y una isla Vue.
- Crear `scripts/verify-web.sh` (raíz, ejecutable, `set -euo pipefail`): en `web/` corre `bun install --frozen-lockfile`, `bun run lint`, `format:check`, `check`, `test` y `build`, e imprime un resumen por paso.
- Límites: no modificar código de aplicación.

## Criterios de aceptación

- [x] Seguir el README en un directorio limpio (sin `node_modules`, con `bun install --frozen-lockfile`) deja el sitio funcionando.
- [x] `scripts/verify-web.sh` termina con código 0.
- [x] El script falla con código distinto de 0 si se introduce un error de lint temporal (comprobado y revertido).
- [x] Los criterios de aceptación del spec están verificados.

## Referencias

- `features/001-web-astro-vue-boilerplate/spec.md`, sección "Fase final" → tarea 008 y "Validación Post-Deploy".

## Fuera de alcance

- CI/CD, despliegue y documentación de `api/` y `app/`.

## Notas de implementación

Una instalación congelada en un directorio limpio permitió seguir el README y usar el contador en Chromium. El script pasó desde el workspace y desde la copia limpia. Un error temporal de lint detuvo el script antes de format:check; tras retirarlo, todos los pasos volvieron a pasar. La validación local incluyó preview, la página 404 y el fallo del build por ausencia de PUBLIC_SITE_URL.
