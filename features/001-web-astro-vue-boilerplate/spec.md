# Especificación: Boilerplate web con Astro + Vue

- **Estado:** Pendiente

## Resumen Ejecutivo

Este conjunto de 8 tareas entrega el boilerplate del frontend público de JQ Fitness en `web/`, basado en Astro con islas interactivas de Vue 3 y TypeScript estricto. No implementa pantallas de negocio, autenticación ni consumo de la API (`api/`) ni de la aplicación (`app/`): solo deja el esqueleto listo para construirlas.

Entrega:

1. **Proyecto Astro + Vue en `web/`**: instalable con `bun install`, con `bun run dev`, `bun run build` y `bun run preview` funcionando.
2. **Estructura y convenciones**: carpetas `components`, `layouts`, `pages`, `styles`, `lib`, alias `@/*`, TypeScript `strict`, y Tailwind CSS v4 para estilos.
3. **Página de ejemplo con isla Vue**: layout base, página de inicio y un componente Vue hidratado (`client:load`) que demuestra la integración.
4. **Calidad automatizada**: ESLint, Prettier, `astro check` y Vitest + Vue Test Utils, todos con scripts de `bun`.
5. **Configuración y documentación**: variables de entorno tipadas (`.env.example`), `README.md` y script `scripts/verify-web.sh`.

Contrato que deja a las siguientes features: estructura de carpetas, alias `@/`, convención de variables `PUBLIC_*` y scripts de calidad (`lint`, `format:check`, `check`, `test`, `build`) que cualquier feature web debe mantener en verde.

---

## Estado actual del repositorio (punto de partida)

| Elemento | Estado |
|----------|--------|
| `web/` | Existe y está vacía |
| `api/`, `app/` | Existen y están vacías (fuera de alcance) |
| `features/` | No existía; esta feature crea `features/001-web-astro-vue-boilerplate/` |
| Repositorio git | No es un repositorio git (no hay historial) |
| Node / Bun | Node v24.22.0, Bun 1.4.3 |
| Versiones vigentes (registro npm, 2026-11-19) | `astro` 7.4.x (requiere Node >=22.23.4), `@astrojs/vue` 7.1.x, `vue` 3.5.x, `tailwindcss` 4.3.x + `@tailwindcss/vite`, `vitest` 5.1.x, `eslint` 10.x, `prettier` 3.10.x |
| Plantillas | `spec-template.md` y `task-template.md` están en la raíz del proyecto (enlaces simbólicos), no dentro de `features/` |

> Verificación obligatoria previa: la tarea 001 debe confirmar con `npm view` (consulta de solo lectura al registro; Bun no ofrece `view` sin `package.json`) las versiones y los requisitos de Node de `astro` y `@astrojs/vue`, y comprobar la sintaxis vigente de `bun create astro@latest` (flags no interactivos) antes de generar nada. Si cambió algo respecto a esta tabla, se ajusta la tarea y se anota en sus notas.

---

## Arquitectura de Cambios

### Fase 1: Base del proyecto (Tareas 001-004)

**001 - Inicializar proyecto Astro con integración Vue**
- Generar el proyecto en `web/` (plantilla `minimal`, TypeScript `strict`, sin git, instalando dependencias).
- Agregar `@astrojs/vue` y `vue`; registrar `vue()` en `web/astro.config.mjs`.
- Fijar `engines.node` y `packageManager` (`bun@<versión>`) en `web/package.json`, y crear `web/.nvmrc`.

**002 - Estructura de carpetas y alias de rutas**
- Crear `web/src/{components,layouts,pages,styles,lib}/` (con `.gitkeep` donde estén vacías).
- Configurar alias `@/*` → `src/*` en `web/tsconfig.json`.
- Agregar `web/public/favicon.svg` y `web/.gitignore` (`node_modules`, `dist`, `.astro`, `.env`).

**003 - Tailwind CSS v4 y estilos globales**
- Instalar `tailwindcss` y `@tailwindcss/vite`; registrarlo en `vite.plugins` de `astro.config.mjs`.
- Crear `web/src/styles/global.css` con `@import "tailwindcss";` y tokens base en `@theme` (fuente y color primario provisional).

**004 - Variables de entorno tipadas**
- Crear `web/.env.example` con `PUBLIC_SITE_URL` y `PUBLIC_API_URL`.
- Declarar los tipos en `web/src/env.d.ts` (`ImportMetaEnv`).
- Crear `web/src/lib/env.ts` que expone las variables validadas (error claro si falta una obligatoria).
- Configurar `site` en `astro.config.mjs` a partir de `PUBLIC_SITE_URL`.

### Fase 2: Interfaz base (Tarea 005)

**005 - Layout base, página de inicio e isla Vue de ejemplo**
- `web/src/layouts/BaseLayout.astro`: `<html lang="es">`, `<head>` con título y descripción por props, importa `global.css`, `<slot />`.
- `web/src/pages/index.astro`: usa el layout y monta `Counter.vue` con `client:load`.
- `web/src/components/Counter.vue`: `<script setup lang="ts">`, estado local con `ref`, props tipadas.
- `web/src/pages/404.astro`: página de error mínima.

### Fase 3: Calidad (Tareas 006-007)

**006 - ESLint y Prettier**
- Instalar `eslint`, `typescript-eslint`, `eslint-plugin-astro`, `eslint-plugin-vue`, `prettier`, `prettier-plugin-astro` y `eslint-config-prettier`.
- Crear `web/eslint.config.js` (flat config) y `web/.prettierrc`, `web/.prettierignore`.
- Scripts: `lint`, `lint:fix`, `format`, `format:check`, `check` (`astro check`, con `@astrojs/check` y `typescript`).
- Formatear el código existente para que `format:check` pase.

**007 - Vitest y Vue Test Utils**
- Instalar `vitest`, `@vue/test-utils` y `happy-dom`.
- Crear `web/vitest.config.ts` usando `getViteConfig` de `astro/config`, entorno `happy-dom`, alias `@/`.
- Pruebas: `src/components/Counter.test.ts` (render e interacción) y `src/lib/env.test.ts` (variable faltante).
- Scripts: `test` y `test:watch`.

### Fase final: Verificación y cierre (Tarea 008)

**008 - Documentación y script de verificación**
- `web/README.md`: requisitos, instalación, scripts, estructura, convenciones y cómo agregar una isla Vue.
- `scripts/verify-web.sh` (raíz del proyecto): ejecuta `bun install --frozen-lockfile`, `lint`, `format:check`, `check`, `test` y `build` en `web/` y falla ante el primer error.

---

## Impacto por Módulo

| Ruta | Cambio |
|------|--------|
| `web/package.json`, `web/bun.lock` | Proyecto, dependencias, scripts y `engines` |
| `web/astro.config.mjs` | Integración Vue, plugin Tailwind, `site` |
| `web/tsconfig.json`, `web/src/env.d.ts` | TypeScript estricto, alias, tipos de entorno |
| `web/src/{layouts,pages,components,styles,lib}/` | Código base y ejemplo |
| `web/eslint.config.js`, `web/.prettierrc*` | Lint y formato |
| `web/vitest.config.ts`, `web/src/**/*.test.ts` | Pruebas |
| `web/.env.example`, `web/.nvmrc`, `web/.gitignore` | Entorno y utilidades |
| `web/README.md`, `scripts/verify-web.sh` | Documentación y verificación |
| `api/`, `app/` | Sin cambios |

---

## Flujos Críticos

### Flujo 1: Desarrollo local
```
1. Desarrollador ejecuta `cd web && bun install && cp .env.example .env && bun run dev`
2. Astro sirve http://localhost:4321 con HMR
3. Resultado: la página de inicio se muestra y el contador Vue responde al clic
```

### Flujo 2: Configuración inválida
```
1. Falta una variable obligatoria (p. ej. `PUBLIC_SITE_URL`) en `.env`
2. `src/lib/env.ts` lanza un error que nombra la variable faltante
3. Resultado: el build/arranque falla con un mensaje accionable, no con `undefined` en producción
```

### Flujo 3: Verificación de calidad
```
1. `scripts/verify-web.sh` ejecuta lint, formato, `astro check`, tests y build
2. Cualquier fallo detiene el script con código distinto de 0
3. Resultado: `web/dist/` generado solo si todo lo anterior pasó
```

---

## Notas de Implementación

### Decisiones
- **Astro + islas Vue (sin SPA completa)**: Astro entrega HTML estático por defecto y Vue solo se hidrata donde se necesita (`client:*`); alternativa descartada: Vue + Vite puro, por peor rendimiento inicial y SEO.
- **Salida estática (`output: 'static'`) por defecto**: no hay requisito de SSR; si una feature futura lo necesita se añade un adaptador en esa feature.
- **Tailwind CSS v4 vía `@tailwindcss/vite`**: es la integración vigente; `@astrojs/tailwind` (v3) queda descartado. Es una elección de este plan: si se prefiere otro enfoque de estilos, solo cambia la tarea 003.
- **Bun como gestor de paquetes y ejecutor de scripts** (decisión del usuario, reemplaza a npm): `bun install`, `bun run <script>`, `bunx`; se versiona `bun.lock`. Astro y Vitest siguen ejecutándose sobre Node (sus binarios usan `#!/usr/bin/env node`), por lo que Node >=22.23.4 sigue siendo requisito. Alternativa descartada: forzar el runtime de Bun con `bunx --bun astro`, por menor compatibilidad con Astro/Vite.
- **Pruebas con `bun run test`, nunca `bun test`**: `bun test` invoca el runner propio de Bun, no Vitest.
- **Vitest con `getViteConfig` de Astro**: reutiliza la configuración de Vite del proyecto (plugin Vue, alias).
- **Idioma de la interfaz**: `lang="es"`; internacionalización fuera de alcance.

### Convención de código
- Componentes Vue con `<script setup lang="ts">`; nombres en PascalCase; un componente por archivo en `src/components/`.
- Solo `src/lib/env.ts` lee `import.meta.env`; el resto importa de ahí.
- Variables expuestas al navegador llevan prefijo `PUBLIC_`; nunca se coloca un secreto en ellas.
- Imports internos con alias `@/` en lugar de rutas relativas profundas.

### Seguridad
- `.env` en `.gitignore`; solo `.env.example` se versiona, sin valores sensibles.
- Dependencias fijadas por `bun.lock`; instalación reproducible con `bun install --frozen-lockfile`.

### Referencias
- https://docs.astro.build/en/guides/integrations-guide/vue/
- https://docs.astro.build/en/guides/typescript/
- https://docs.astro.build/en/guides/environment-variables/
- https://docs.astro.build/en/guides/styling/#tailwind
- https://docs.astro.build/en/guides/testing/
- https://vuejs.org/guide/typescript/composition-api.html

### Fuera de alcance
- Diseño visual definitivo, branding y contenido real.
- Consumo de `api/` (cliente HTTP, autenticación) y relación con `app/`.
- Despliegue, CI/CD y contenedores.
- Internacionalización, analítica, SEO avanzado (sitemap, Open Graph).
- Gestión de estado global (Pinia) y enrutado del lado del cliente: se agregan cuando una feature los requiera.

---

## Criterios de Aceptación

- [ ] `cd web && bun install --frozen-lockfile && bun run dev` levanta el sitio en `http://localhost:4321` y la isla Vue responde a la interacción.
- [ ] `bun run build` genera `web/dist/` sin errores ni advertencias de tipos; `bun run preview` lo sirve.
- [ ] Alias `@/` funciona en código Astro, Vue y pruebas.
- [ ] Falta de una variable obligatoria produce un error que la nombra (cubierto por prueba).
- [ ] `bun run lint`, `bun run format:check`, `bun run check` y `bun run test` terminan en verde.
- [ ] `web/.env` está ignorado por git y `web/.env.example` documenta todas las variables.
- [ ] `web/README.md` y `scripts/verify-web.sh` existen y el script termina en verde.

---

## Dependencias Entre Tareas

```
001 (proyecto Astro + Vue)       → 002, 003, 004
002 (estructura y alias)         → 005, 007
003 (Tailwind)                   → 005
004 (variables de entorno)       → 005, 007
005 (layout, inicio, isla Vue)   → 006, 007
006 (ESLint + Prettier)          → 008
007 (Vitest)                     → 008
001-007                          → 008 (documentación y verificación)
```

---

## Validación Post-Deploy

1. `scripts/verify-web.sh` → todas las comprobaciones en verde.
2. `cd web && bun run build && bun run preview` y abrir `http://localhost:4321`: se ve la página de inicio con el contador funcionando.
3. Abrir `http://localhost:4321/ruta-inexistente`: se muestra la página 404.
4. Quitar `PUBLIC_SITE_URL` de `.env` y ejecutar `bun run build`: falla con un mensaje que nombra la variable.

---

## Prompt y modelo utilizado

### Modelo

Sonnet 5.5

### Prompt

```
Haz el boilerplate para un proyecto en Astro + Vue en la carpeta web

El plan que generaras déjalo plasmado en español en features/NNN-…/spec.md, crea las carpetas de ser necesario respetando el consecutivo, puedes usar features/spec-template.md como plantilla. Luego con base en ese spec crea las tareas granulares en features/NNN-…/tasks/NNN-….md, creando un consecutivo ordenado, tasks debidamente priorizadas teniendo en cuenta dependencias resueltas con anterioridad, puedes usar features/task-template.md como plantilla.
```
