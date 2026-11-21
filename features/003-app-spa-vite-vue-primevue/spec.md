# Especificación: Boilerplate SPA con Vite + Vue + PrimeVue + Tailwind + PocketBase SDK

- **Estado:** Completado

## Resumen Ejecutivo

Este conjunto de 10 tareas entrega el boilerplate de la aplicación SPA de JQ Fitness en `app/`, basado en Vite, Vue 3 con TypeScript estricto, PrimeVue, Tailwind CSS v4 y el SDK de PocketBase. No implementa pantallas de negocio ni modifica `api/` ni `web/`: solo deja el esqueleto listo, con un flujo mínimo de inicio de sesión que demuestra la integración de todas las piezas.

Entrega:

1. **Proyecto Vite + Vue en `app/`**: instalable con `bun install`, con `bun run dev`, `bun run build` y `bun run preview` funcionando.
2. **UI con PrimeVue + Tailwind v4**: PrimeVue con el tema Aura (modo oscuro por clase `.app-dark`), `primeicons` y `tailwindcss-primeui` para usar los tokens del tema como utilidades de Tailwind, con orden de capas CSS controlado.
3. **Cliente PocketBase**: instancia única del SDK (`src/lib/pocketbase.ts`) configurada por variable de entorno, y composable `useAuth` reactivo sobre `pb.authStore`.
4. **Enrutado SPA**: Vue Router con historial HTML5, vistas `Home` (protegida), `Login` y `NotFound`, y guard de autenticación.
5. **Calidad automatizada**: ESLint, Prettier, `vue-tsc` y Vitest + Vue Test Utils, con scripts de `bun`.
6. **Configuración y documentación**: variables de entorno tipadas (`.env.example`), `README.md` y `scripts/verify-app.sh`.

Contrato que deja a las siguientes features: estructura de carpetas, alias `@/`, convención de variables `VITE_*`, el cliente `pb` y `useAuth`, el guard por `meta.requiresAuth`, y los scripts de calidad (`lint`, `format:check`, `typecheck`, `test`, `build`) que cualquier feature de `app/` debe mantener en verde.

---

## Estado actual del repositorio (punto de partida)

| Elemento | Estado |
|----------|--------|
| `app/` | Existe y está vacía |
| `web/` | Sitio Astro + Vue ya implementado (features 001 y 002); fuera de alcance. Sirve de referencia de convenciones (Bun, ESLint flat config, Prettier con comillas simples, Vitest) |
| `api/` | PocketBase con hooks TypeScript compilados con Bun (`api/pb_hooks`, `api/src`); `api/pb_migrations` vacío. Sin cambios en esta feature |
| `features/` | Existen `001-web-astro-vue-boilerplate` y `002-web-replica-lovable`; esta feature crea `003-app-spa-vite-vue-primevue` |
| Node / Bun | Node v24.22.0, Bun 1.4.3 |
| Versiones vigentes (registro npm, 2026-11-20) | `vite` 8.3.x (Node `^20.19.0 \|\| >=22.12.0`), `@vitejs/plugin-vue` 6.0.x, `vue` 3.5.x, `vue-router` 5.5.x, `primevue` 5.0.x, `@primeuix/themes` 3.1.x, `primeicons` 8.0.x, `tailwindcss` + `@tailwindcss/vite` 4.3.x, `tailwindcss-primeui` 0.6.x, `pocketbase` 0.29.x, `typescript` 7.0.x, `vue-tsc` 3.3.x, `vitest` 5.1.x (Node `^22.12.0 \|\| ^24.0.0`), `eslint` 10.x, `prettier` 3.10.x |
| Plantillas | `spec-template.md` y `task-template.md` están en la raíz del proyecto (enlaces simbólicos); su contenido está orientado a Go/PocketBase y se adaptó a un frontend (secciones de contrato HTTP, modelo de datos y migraciones omitidas) |

> Verificación obligatoria previa: la tarea 001 debe confirmar con `npm view` las versiones y requisitos de Node de `vite`, `primevue` y `vue-tsc`, y que `vue-tsc` funciona con `typescript` 7 (si no, fijar `typescript` a la mayor compatible y anotarlo en las notas). La tarea 004 debe comprobar la API vigente de PrimeVue 5 (`primevue/config`, `@primeuix/themes/aura`) antes de configurar el plugin.

---

## Arquitectura de Cambios

### Fase 1: Base del proyecto (Tareas 001-003)

**001 - Inicializar proyecto Vite + Vue + TypeScript**
- Crear `app/package.json` (`name: jq-fitness-app`, `private`, `type: module`, `engines.node`, `packageManager: bun@<versión>`), `app/.nvmrc`, `app/index.html`, `app/vite.config.ts` (plugin Vue), `app/tsconfig.json` (+ `tsconfig.app.json` y `tsconfig.node.json`, `strict`), `src/main.ts` y `src/App.vue` mínimos.
- Scripts: `dev`, `build` (`vue-tsc -b && vite build`), `preview`, `typecheck`.

**002 - Estructura de carpetas y alias de rutas**
- Crear `app/src/{assets,components,composables,lib,router,views,styles}/` (con `.gitkeep` donde estén vacías).
- Alias `@/*` → `src/*` en `tsconfig.app.json` y `vite.config.ts`.
- `app/.gitignore` (`node_modules`, `dist`, `.env`, `*.tsbuildinfo`) y `public/favicon.svg`.

**003 - Tailwind CSS v4**
- Registrar `@tailwindcss/vite` en `vite.config.ts`.
- Crear `src/styles/main.css` con `@import "tailwindcss";` y `@theme` base (fuente); importarlo desde `main.ts`.

### Fase 2: Integraciones (Tareas 004-006)

**004 - PrimeVue, tema Aura y `tailwindcss-primeui`**
- Registrar `PrimeVue` en `main.ts` con preset `Aura`, `darkModeSelector: '.app-dark'` y `cssLayer: { name: 'primevue', order: 'theme, base, primevue' }`.
- En `main.css`: `@import "tailwindcss-primeui";` y `@custom-variant dark (&:where(.app-dark, .app-dark *));`.
- Importar `primeicons/primeicons.css`. Componentes PrimeVue importados explícitamente donde se usan (sin auto-import en el boilerplate).

**005 - Variables de entorno tipadas**
- `app/.env.example` con `VITE_POCKETBASE_URL=http://127.0.0.1:8090`.
- Tipos en `src/env.d.ts` (`ImportMetaEnv`) y `src/lib/env.ts` como único lector de `import.meta.env`, con error claro si falta una variable obligatoria o no es una URL válida.

**006 - Cliente PocketBase y composable de autenticación**
- `src/lib/pocketbase.ts`: exporta una única instancia `pb = new PocketBase(env.pocketbaseUrl)`.
- `src/composables/useAuth.ts`: estado reactivo (`user`, `isAuthenticated`) sincronizado con `pb.authStore.onChange`, y acciones `login(email, password)` (colección `users`) y `logout()`.

### Fase 3: Interfaz base (Tarea 007)

**007 - Vue Router, vistas base y guard**
- `src/router/index.ts`: `createRouter` con `createWebHistory`, rutas `/` (Home, `meta.requiresAuth`), `/login` (Login) y catch-all (NotFound); guard `beforeEach` que redirige a `/login?redirect=<ruta>` si no hay sesión y de `/login` a `/` si ya la hay.
- `src/views/{HomeView,LoginView,NotFoundView}.vue` usando `Button`, `InputText`, `Password` y `Card` de PrimeVue y utilidades de Tailwind; `HomeView` muestra el correo del usuario y un botón para cerrar sesión.
- `App.vue` con `<RouterView />`.

### Fase 4: Calidad (Tareas 008-009)

**008 - ESLint y Prettier**
- Instalados en la fase 1: `eslint`, `typescript-eslint`, `eslint-plugin-vue`, `eslint-config-prettier`, `prettier`.
- `app/eslint.config.js` (flat config, mismo estilo que `web/`), `app/.prettierrc` (`singleQuote`) y `.prettierignore`.
- Scripts: `lint`, `lint:fix`, `format`, `format:check`. Formatear el código existente.

**009 - Vitest y Vue Test Utils**
- `app/vitest.config.ts` (fusiona `vite.config.ts`, entorno `happy-dom`).
- Pruebas: `src/lib/env.test.ts` (variable faltante o inválida), `src/composables/useAuth.test.ts` (login/logout con `pb` simulado) y `src/router/index.test.ts` (guard).
- Scripts: `test` y `test:watch`.

### Fase final: Verificación y cierre (Tarea 010)

**010 - Documentación y script de verificación**
- `app/README.md`: requisitos, instalación, scripts, estructura, convenciones y cómo agregar una vista.
- `scripts/verify-app.sh` (raíz): `bun install --frozen-lockfile`, `lint`, `format:check`, `typecheck`, `test` y `build` en `app/`, fallando ante el primer error.

---

## Impacto por Módulo

| Ruta | Cambio |
|------|--------|
| `app/package.json`, `app/bun.lock` | Proyecto, dependencias, scripts y `engines` |
| `app/vite.config.ts`, `app/vitest.config.ts` | Plugins Vue y Tailwind, alias, pruebas |
| `app/tsconfig*.json`, `app/src/env.d.ts` | TypeScript estricto, alias, tipos de entorno |
| `app/src/{main.ts,App.vue}` | Arranque: PrimeVue, router, estilos |
| `app/src/{lib,composables,router,views,styles}/` | Código base |
| `app/eslint.config.js`, `app/.prettierrc*` | Lint y formato |
| `app/.env.example`, `app/.nvmrc`, `app/.gitignore` | Entorno y utilidades |
| `app/README.md`, `scripts/verify-app.sh` | Documentación y verificación |
| `api/`, `web/` | Sin cambios |

---

## Flujos Críticos

### Flujo 1: Desarrollo local
```
1. Desarrollador ejecuta `cd app && bun install && cp .env.example .env && bun run dev`
2. Vite sirve http://localhost:5173 con HMR
3. Resultado: sin sesión, la ruta `/` redirige a `/login`, que se ve con estilos de PrimeVue y Tailwind
```

### Flujo 2: Inicio y cierre de sesión
```
1. Usuario abre `/login`, introduce correo y contraseña → `pb.collection('admins').authWithPassword`
2. `pb.authStore` guarda el token (localStorage) y `useAuth` actualiza `isAuthenticated`
3. El router redirige a la ruta indicada en `?redirect` o a `/`
4. "Cerrar sesión" ejecuta `pb.authStore.clear()` → el guard devuelve a `/login`
5. Resultado: la sesión sobrevive a un refresco de página mientras el token no expire
```

### Flujo 3: Credenciales inválidas o configuración incorrecta
```
1. Credenciales erróneas → PocketBase responde 400; `login` propaga el error y la vista muestra un mensaje sin revelar detalles internos
2. Falta `VITE_POCKETBASE_URL` → `src/lib/env.ts` lanza un error que nombra la variable
3. Resultado: fallo explícito y accionable, no `undefined` en tiempo de ejecución
```

---

## Notas de Implementación

### Decisiones
- **SPA pura con Vite + Vue Router (historial HTML5)**: es lo pedido para `app/`. El servidor que la aloje debe devolver `index.html` ante rutas desconocidas (fallback); el despliegue queda fuera de alcance.
- **Vue Router sí, Pinia no**: una SPA con vistas necesita enrutado; el estado de sesión ya lo aporta `pb.authStore` envuelto en `useAuth`. Pinia se añade cuando una feature requiera estado global. Es una elección de este plan.
- **Tailwind CSS v4 vía `@tailwindcss/vite`** y **`tailwindcss-primeui`** (versión v4 por CSS: `@import "tailwindcss-primeui";`) para usar `bg-primary`, `text-surface-500`, etc. Alternativa descartada: plugin de PostCSS, por ser innecesario con Vite.
- **PrimeVue en modo estilizado con tema Aura de `@primeuix/themes`**; capas CSS (`theme, base, primevue`) para que Tailwind pueda sobrescribir estilos de PrimeVue sin `!important`. Modo oscuro por clase `.app-dark` (no por preferencia del sistema) para controlarlo desde la app.
- **Importación explícita de componentes PrimeVue**: evita añadir `unplugin-vue-components` al boilerplate; se reconsidera si crece el número de componentes.
- **Bun como gestor de paquetes** (coherente con `web/` y `api/`): `bun install`, `bun run <script>`, se versiona `bun.lock`. Pruebas con `bun run test`, nunca `bun test`.
- **Pruebas con `vue-tsc` y Vitest** sobre Node >=22.12 (requisito de Vite 8 y Vitest 5).
- **SDK de PocketBase como instancia única** exportada desde `src/lib/pocketbase.ts`; el resto del código la importa y no crea otras. `autoCancellation` queda con su valor por defecto del SDK.
- **Idioma de la interfaz**: `lang="es"`; internacionalización fuera de alcance.

### Convención de código
- Componentes Vue con `<script setup lang="ts">`; PascalCase; vistas en `src/views/` con sufijo `View`.
- Solo `src/lib/env.ts` lee `import.meta.env`; solo `src/lib/pocketbase.ts` instancia `PocketBase`.
- Variables expuestas al navegador llevan prefijo `VITE_`; nunca se coloca un secreto en ellas.
- Imports internos con alias `@/`; rutas con carga diferida (`() => import(...)`) salvo la inicial.

### Seguridad
- `.env` en `.gitignore`; solo `.env.example` se versiona, sin valores sensibles.
- El token de sesión se guarda en `localStorage` (comportamiento por defecto del SDK): se asume el riesgo de XSS; no renderizar HTML sin sanear (`v-html`).
- El parámetro `redirect` del login solo se acepta si es una ruta interna (empieza por `/` y no por `//`) para evitar redirecciones abiertas.
- La autorización real vive en las reglas de API de PocketBase; el guard del router es solo experiencia de usuario.

### Referencias
- https://vite.dev/guide/
- https://vuejs.org/guide/typescript/composition-api.html
- https://router.vuejs.org/
- https://primevue.org/vite/
- https://primevue.org/theming/styled/
- https://primevue.org/tailwind/
- https://tailwindcss.com/docs/installation/using-vite
- https://github.com/pocketbase/js-sdk
- https://pocketbase.io/docs/authentication/

### Fuera de alcance
- Pantallas y lógica de negocio, diseño definitivo y branding.
- Cambios en `api/` (colecciones, reglas, migraciones) y en `web/`.
- Registro de usuarios, recuperación de contraseña, OAuth2, tiempo real.
- Despliegue, Docker, Nginx y CI/CD.
- Internacionalización, PWA, Pinia, auto-import de componentes.

---

## Criterios de Aceptación

- [x] `cd app && bun install --frozen-lockfile && bun run dev` levanta la SPA en `http://localhost:5173` y `/` redirige a `/login` sin sesión.
- [x] `bun run build` genera `app/dist/` sin errores de tipos; `bun run preview` lo sirve.
- [x] Los componentes de PrimeVue se ven con el tema Aura y las utilidades de Tailwind (incluidas las de `tailwindcss-primeui`) se aplican sobre ellos.
- [x] `pb` es una única instancia configurada con `VITE_POCKETBASE_URL`; `useAuth` refleja login y logout.
- [x] El guard protege `/`, respeta `?redirect` solo con rutas internas y la ruta desconocida muestra `NotFound`.
- [x] Falta de `VITE_POCKETBASE_URL` produce un error que la nombra (cubierto por prueba).
- [x] `bun run lint`, `bun run format:check`, `bun run typecheck` y `bun run test` terminan en verde.
- [x] `app/.env` está ignorado por git y `app/.env.example` documenta todas las variables.
- [x] `app/README.md` y `scripts/verify-app.sh` existen y el script termina en verde.

---

## Dependencias Entre Tareas

```
001 (proyecto Vite + Vue)        → 002, 003, 005, 008
002 (estructura y alias)         → 004, 005, 006, 007, 009
003 (Tailwind)                   → 004
004 (PrimeVue + tema)            → 007
005 (variables de entorno)       → 006
006 (cliente PocketBase, useAuth)→ 007
007 (router, vistas y guard)     → 009
008 (ESLint + Prettier)          → 010
009 (Vitest)                     → 010
001-009                          → 010 (documentación y verificación)
```

---

## Validación Post-Deploy

1. `scripts/verify-app.sh` → todas las comprobaciones en verde.
2. Con PocketBase corriendo (`api/`) y un usuario en la colección `users`: `cd app && bun run dev`, abrir `http://localhost:5173`, iniciar sesión y ver `HomeView` con el correo del usuario.
3. Refrescar la página: la sesión se mantiene. "Cerrar sesión" devuelve a `/login`.
4. Credenciales erróneas: se muestra un mensaje de error y no se navega.
5. Quitar `VITE_POCKETBASE_URL` de `.env` y abrir `bun run dev`: la aplicación falla al cargar con un mensaje que nombra la variable (el build no lo detecta: la validación ocurre en tiempo de ejecución).

---

## Prompt y modelo utilizado

### Modelo

Sonnet 5.5

### Prompt

```
Crea en la carpeta /app el boilerplate inicial para un proyecto SPA Vite + Vue + PrimeVue + Tailwind + Pocketbase SDK

El plan que generaras déjalo plasmado en español en features/NNN-…/spec.md, crea las carpetas de ser necesario respetando el consecutivo, puedes usar features/spec-template.md como plantilla. Luego con base en ese spec crea las tareas granulares en features/NNN-…/tasks/NNN-….md, creando un consecutivo ordenado, tasks debidamente priorizadas teniendo en cuenta dependencias resueltas con anterioridad, puedes usar features/task-template.md como plantilla.
```
