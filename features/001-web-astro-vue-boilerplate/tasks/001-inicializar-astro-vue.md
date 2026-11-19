# 001 - [Config] Inicializar proyecto Astro con integración Vue

- **Prioridad:** 1
- **Estado:** Pendiente
- **Depende de:** Ninguna
- **Fase:** Fase 1: Base del proyecto

## Objetivo

Existe un proyecto Astro con TypeScript estricto y la integración de Vue en `web/`, que arranca y compila.

## Contexto

`web/` está vacía y no es un repositorio git. Node v24.22.0, Bun 1.4.3. Antes de generar nada, verificar con `npm view astro version engines.node` y `npm view @astrojs/vue version engines.node` (consulta de solo lectura; `bun pm view` exige un `package.json` previo) las versiones y requisitos vigentes (spec: Astro 7.4.x requiere Node >=22.23.4), y revisar con `bun create astro@latest --help` (o `bunx create-astro@latest --help`) los flags no interactivos.

## Alcance

- Generar el proyecto dentro de `web/` con Bun (`bun create astro@latest`, plantilla `minimal`, TypeScript `strict`, instalar dependencias con Bun, sin inicializar git). Eliminar cualquier `package-lock.json` residual y confirmar que queda `bun.lock`.
- Instalar con `bun add` `@astrojs/vue` y `vue`; registrar `vue()` en `web/astro.config.mjs`.
- Establecer `name` (`jq-fitness-web`), `private: true`, `engines.node` y `packageManager` (`bun@<versión de `bun -v`>`) en `web/package.json`; crear `web/.nvmrc` con la versión mayor de Node soportada.
- Fuera de los límites: no crear carpetas de estructura (tarea 002) ni estilos (tarea 003).

## Criterios de aceptación

- [ ] `cd web && bun run build` termina sin errores.
- [ ] `bun run dev` sirve `http://localhost:4321` con respuesta 200.
- [ ] `astro.config.mjs` incluye la integración `vue()` y `tsconfig.json` extiende `astro/tsconfigs/strict`.
- [ ] `bun.lock` existe, no hay `package-lock.json` y `bun install --frozen-lockfile` funciona.

## Referencias

- `features/001-web-astro-vue-boilerplate/spec.md`, sección "Fase 1" → tarea 001.
- https://docs.astro.build/en/install-and-setup/
- https://docs.astro.build/en/guides/integrations-guide/vue/

## Fuera de alcance

- Estructura de carpetas y alias (tarea 002), Tailwind (003), variables de entorno (004).

## Notas de implementación

<!-- Se completa al terminar la tarea. -->
