# 002 - [Config] Estructura de carpetas y alias de rutas

- **Prioridad:** 2
- **Estado:** Completado
- **Depende de:** 001
- **Fase:** Fase 1: Base del proyecto

## Objetivo

El proyecto tiene la estructura de carpetas acordada y el alias `@/` resuelve a `src/` en TypeScript, Astro y Vue.

## Contexto

Tras la tarea 001 existe el proyecto generado por Astro. Verificar el contenido real de `web/src` y `web/tsconfig.json` antes de modificar.

## Alcance

- Crear `web/src/components/`, `layouts/`, `styles/`, `lib/` (con `.gitkeep` si quedan vacías) y mantener `pages/`.
- Modificar `web/tsconfig.json`: `compilerOptions.baseUrl: "."` y `paths: { "@/*": ["src/*"] }`.
- Crear `web/public/favicon.svg` (si la plantilla no lo trajo) y `web/.gitignore` con `node_modules`, `dist`, `.astro`, `.env`, `.env.*` (excepto `.env.example`).
- Límites: no crear componentes ni páginas (tarea 005).

## Criterios de aceptación

- [x] Las cinco carpetas existen bajo `web/src/`.
- [x] Un import de prueba `import x from '@/lib/...'` resuelve en `bun run build` (validado temporalmente y luego retirado).
- [x] `git check-ignore web/.env` (en un repo git) o inspección de `.gitignore` confirma que `.env` se ignora y `.env.example` no.
- [x] `bun run build` pasa en verde.

## Referencias

- `features/001-web-astro-vue-boilerplate/spec.md`, sección "Fase 1" → tarea 002.
- https://docs.astro.build/en/guides/typescript/#import-aliases

## Fuera de alcance

- Contenido de las carpetas (tareas 003-005).

## Notas de implementación

Verificados el alias mediante un import temporal, el build con y sin esa comprobación, y las exclusiones de entorno con git check-ignore. Se reutilizó el favicon SVG de la plantilla.
