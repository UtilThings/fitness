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
  components/   componentes reutilizables de autenticación y administración
  composables/  sesión, colecciones, avisos y confirmaciones
  layouts/      AuthLayout, AdminLayout y admin-nav.ts (menú lateral)
  lib/          entorno, PocketBase, permisos, fechas y dinero
  router/       rutas, guard y safeRedirect
  styles/       main.css (Tailwind + tailwindcss-primeui)
  types/        tipos TypeScript de las colecciones
  views/        vistas por área: auth/, admin/ y errores de navegación
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

## Módulos de administración

1. Define el tipo de la colección en `src/types/pb.ts`. Usa `BaseRecord` como base, campos en `snake_case`, relaciones como IDs de tipo `string`, `expand?` para relaciones expandidas y fechas ISO UTC.
2. Crea una vista en `src/views/admin/` y regístrala como hija de `AdminLayout` con `name` y `meta.title`. Activa su entrada en `admin-nav.ts` quitando `placeholder` cuando la ruta esté disponible.
3. Declara `meta.roles` si la vista está restringida y usa los mismos roles en el menú. El router envía al usuario a `/forbidden` si su rol queda fuera. Para acciones dentro de la vista, añade el permiso a `permissions.ts` y consúltalo con `useAuth().can(permiso)`. Las reglas de PocketBase autorizan las operaciones.

Por ejemplo, para listar el equipo, importa los componentes compartidos y usa este patrón en la vista:

```vue
<script setup lang="ts">
import { onMounted } from 'vue';
import DataToolbar from '@/components/DataToolbar.vue';
import EmptyState from '@/components/EmptyState.vue';
import PageHeader from '@/components/PageHeader.vue';
import { useCollection } from '@/composables/useCollection';
import type { Admin } from '@/types/pb';

const { items, error, loading, load, search } = useCollection<Admin>('admins', {
  sort: 'name',
});
onMounted(load);
</script>

<template>
  <PageHeader title="Equipo" />
  <DataToolbar
    placeholder="Buscar por nombre o correo"
    @search="search($event, ['name', 'email'])"
  />
  <p v-if="error" role="alert">{{ error.message }}</p>
  <p v-else-if="loading" role="status">Cargando equipo…</p>
  <EmptyState
    v-else-if="!items.length"
    icon="pi pi-users"
    title="Sin integrantes"
  />
  <ul v-else>
    <li v-for="item in items" :key="item.id">{{ item.name }}</li>
  </ul>
</template>
```

Usa `total`, `page` y `perPage` para paginar con `setPage`. `setSort` y `search` vuelven a la primera página. Para aplicar filtros desde el slot `filters`, asigna cláusulas `{ expression: 'active = {:active}', params: { active: true } }` a `filters.value` y ejecuta `setPage(1)`. Reserva las expresiones y los nombres de campo para código del módulo y pasa las entradas del usuario en `params`.

Usa `StatusTag` para asociar cada estado a `{ label, severity }`. En el botón de borrado, llama a `useConfirmDelete().confirmDelete({ message, onConfirm })` y ejecuta `remove(id)` dentro de `onConfirm`. `create` y `update` devuelven el registro y `remove` devuelve la confirmación booleana del SDK. Las tres operaciones recargan la lista tras una escritura exitosa. En caso de rechazo, muestra `error.fields` junto a los campos y usa `useNotify()` para el aviso de éxito o error.

Para mostrar fechas de PocketBase, usa `formatDateTime(iso)` de `datetime.ts`. Convierte la fecha y hora local de un formulario con `localToUtcIso(date, time)` antes de guardar. La zona del negocio es `America/New_York`. Guarda importes en centavos, muéstralos con `formatUsd(cents)` y valida la entrada con `parseUsdToCents(text)`, que devuelve `null` si es inválida.

## Despliegue

El servidor estático debe devolver `index.html` para cualquier ruta desconocida (fallback de SPA). El despliegue no forma parte del boilerplate.
