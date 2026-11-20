# JQ Fitness app

SPA de JQ Fitness con Vite, Vue 3, TypeScript, PrimeVue (tema Aura), Tailwind CSS v4 y el SDK de PocketBase.

## Requisitos e instalación

- Node.js 24, según `.nvmrc` (mínimo 22.12).
- Bun 1.4.3 para instalar dependencias y ejecutar scripts.
- Un servidor PocketBase accesible (ver `api/`).

```bash
cd app
bun install --frozen-lockfile
cp .env.example .env
bun run dev
```

Abre http://localhost:5173. Sin sesión, `/` redirige a `/login`.

## Variables de entorno

| Variable              | Obligatoria | Descripción                                                                   |
| --------------------- | ----------- | ----------------------------------------------------------------------------- |
| `VITE_POCKETBASE_URL` | Sí          | URL base de PocketBase, sin barra final (por defecto `http://127.0.0.1:8090`) |

Solo `src/lib/env.ts` lee `import.meta.env`. Las variables `VITE_*` llegan al navegador: nunca pongas secretos en ellas.

## Scripts

| Script                            | Descripción                                |
| --------------------------------- | ------------------------------------------ |
| `bun run dev`                     | Servidor de desarrollo con HMR             |
| `bun run build`                   | Comprueba tipos y genera `dist/`           |
| `bun run preview`                 | Sirve `dist/`                              |
| `bun run typecheck`               | `vue-tsc -b`                               |
| `bun run lint` / `lint:fix`       | ESLint                                     |
| `bun run format` / `format:check` | Prettier                                   |
| `bun run test` / `test:watch`     | Vitest (usa `bun run test`, no `bun test`) |

`scripts/verify-app.sh`, en la raíz del repositorio, ejecuta todos los pasos de calidad y falla en el primero que falle.

## Estructura

```
src/
  assets/       recursos importados desde código
  components/   componentes reutilizables (AuthHeading)
  composables/  lógica reactiva (useAuth, useMediaQuery)
  layouts/      AuthLayout, AdminLayout y admin-nav.ts (menú lateral)
  lib/          env.ts (entorno) y pocketbase.ts (instancia única `pb`)
  router/       rutas, guard y safeRedirect
  styles/       main.css (Tailwind + tailwindcss-primeui)
  views/        vistas por área: auth/, admin/ (y NotFoundView); sufijo View
```

## Convenciones

- Alias `@/` para `src/`.
- Componentes con `<script setup lang="ts">`. Los componentes de PrimeVue se importan explícitamente (`import Button from 'primevue/button'`).
- Usa siempre `pb` de `@/lib/pocketbase`; no crees otras instancias de `PocketBase`.
- Modo oscuro: añade la clase `app-dark` a `<html>`. Las utilidades `dark:` de Tailwind siguen esa clase.
- Las utilidades de `tailwindcss-primeui` (`bg-primary`, `text-surface-500`...) usan los tokens del tema.
- El guard del router es solo experiencia de usuario; la autorización real son las reglas de API de PocketBase.

## Layouts y vistas

Los layouts son rutas padre con `<RouterView />`; las vistas solo aportan su contenido.

- `AuthLayout`: tarjeta centrada con el logo. Cada vista pone su título con `AuthHeading`. Rutas: `/login`, `/forgot-password`.
- `AdminLayout`: barra lateral flotante (`Sidebar*` de PrimeVue 5), cabecera con el título de `route.meta.title` y menú de usuario. En escritorio se colapsa a iconos; por debajo de 768 px es un panel superpuesto. Protege todas sus hijas (`meta.requiresAuth`).

### Agregar una vista de auth

1. Crea `src/views/auth/MiVista.vue` (empieza con `<AuthHeading title="..." />`).
2. Añádela como hija del padre `AuthLayout` en `src/router/index.ts`, con `name` y `meta.title`. Si no debe verse con sesión iniciada, agrega su `name` a `authRoutes`.

### Agregar una vista de admin

1. Crea `src/views/admin/PerfilView.vue`.
2. Añade la ruta como hija del padre `AdminLayout` (`{ path: 'perfil', name: 'perfil', component: () => import('@/views/admin/PerfilView.vue'), meta: { title: 'Perfil' } }`).
3. Agrega la entrada en `src/layouts/admin-nav.ts`. Las entradas actuales (excepto Dashboard) son marcadores sin ruta y llevan a la vista 404.

## Despliegue

El servidor estático debe devolver `index.html` para cualquier ruta desconocida (fallback de SPA). El despliegue no forma parte del boilerplate.
