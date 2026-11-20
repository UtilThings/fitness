# 010 - [Docs] Documentación y script de verificación

- **Prioridad:** 10
- **Estado:** Completado
- **Depende de:** 001, 002, 003, 004, 005, 006, 007, 008, 009
- **Fase:** Fase final: Verificación y cierre

## Objetivo

Cualquier desarrollador puede instalar, ejecutar y verificar `app/` siguiendo el README, y un único script comprueba que todo está en verde.

## Contexto

`web/README.md` y `scripts/verify-web.sh` son el modelo de formato. Todos los scripts de calidad existen tras las tareas 001-009.

## Alcance

- Crear `app/README.md`: requisitos (Node 24, Bun), instalación (`bun install --frozen-lockfile`, `cp .env.example .env`, `bun run dev`), tabla de scripts, estructura de `src/`, convenciones (alias, `env.ts`, `pb`, `useAuth`, modo oscuro), cómo agregar una vista protegida y nota sobre el fallback a `index.html` en el servidor.
- Crear `scripts/verify-app.sh` (ejecutable, `set -euo pipefail`, mismo estilo que `verify-web.sh`): `bun install --frozen-lockfile`, `lint`, `format:check`, `typecheck`, `test`, `build` en `app/`.
- Marcar la feature como completada: estado en `spec.md`, criterios de aceptación y estado de cada tarea.

## Criterios de aceptación

- [x] `scripts/verify-app.sh` termina con código 0 y falla ante el primer paso que falle.
- [x] Seguir el README en un clon limpio levanta la SPA.
- [x] El README documenta todas las variables de `.env.example`.

## Referencias

- `features/003-app-spa-vite-vue-primevue/spec.md`, sección "Fase final" → tarea 010.
- `web/README.md`, `scripts/verify-web.sh`.

## Fuera de alcance

- Despliegue, Docker, Nginx y CI/CD.

## Notas de implementación

`scripts/verify-app.sh` ejecutado: todos los pasos en verde.
