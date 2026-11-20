# Especificación: Layouts de autenticación y administración en `app/`

- **Estado:** Completado

## Resumen Ejecutivo

Este conjunto de 6 tareas añade a la SPA de `app/` dos layouts reutilizables y reorganiza las vistas por área: `layouts/AuthLayout.vue` (tarjeta centrada con logo, para las pantallas de autenticación) y `layouts/AdminLayout.vue` (barra lateral flotante con navegación agrupada, cabecera y menú de usuario, responsive). No implementa módulos de negocio: el menú y el dashboard son marcadores de posición.

Entrega:

1. **Identidad visual**: logo de JQ Fitness en `src/assets`, color primario esmeralda en el preset de PrimeVue y fondo `surface-50`.
2. **`AuthLayout`**: tarjeta blanca redondeada y centrada con el logo y el contenido de cada vista (título y subtítulo con `AuthHeading`).
3. **Vistas de auth en `views/auth/`**: `LoginView` (movida) y `ForgotPasswordView` (nueva, usa `requestPasswordReset` de PocketBase).
4. **`AdminLayout`**: `SidebarLayout` de PrimeVue 5 (variante `floating`), grupos de navegación con iconos y badges, cabecera con botón para colapsar y título de la ruta, y menú de usuario con avatar (correo, Ajustes, Notificaciones, Cerrar sesión). En móvil la barra es un panel superpuesto con fondo oscurecido.
5. **Vistas de admin en `views/admin/`**: `DashboardView` como página inicial.

Contrato que deja a las siguientes features: rutas de auth como hijas de `AuthLayout`, rutas protegidas como hijas de `AdminLayout`, navegación declarada en `src/layouts/admin-nav.ts` y título de página por `meta.title`.

---

## Estado actual del repositorio (punto de partida)

| Elemento | Estado |
|----------|--------|
| `app/` | Feature 003 completada: PrimeVue 5 (Aura), Tailwind v4, `useAuth`, router con guard |
| `app/src/views/` | `HomeView.vue`, `LoginView.vue`, `NotFoundView.vue` sueltas |
| `app/src/layouts/` | No existe |
| Logo | `web/src/assets/jq-logo.png` (666×714, RGBA, trazo verde-turquesa a amarillo); `web/public/favicon.png` (64×64) |
| PrimeVue 5 | Incluye la familia `Sidebar*` (`SidebarLayout`, `Sidebar`, `SidebarAside`, `SidebarPanel`, `SidebarHeader`, `SidebarContent`, `SidebarFooter`, `SidebarGroup*`, `SidebarMenu*`, `SidebarTrigger`, `SidebarBackdrop`, `SidebarMain`, `SidebarSpacer`); no detecta el viewport móvil por sí misma |
| Referencias de diseño | Dos capturas aportadas por el usuario (auth: tarjeta centrada «Forgot password»; admin: barra lateral flotante con grupos, badges y menú de usuario, y versión móvil con panel superpuesto) |

> Verificación obligatoria previa: la tarea 005 debe confirmar en `node_modules/primevue/sidebar*` las props vigentes (`variant`, `collapsible`, `overlay`, `open`) antes de montar el layout.

---

## Arquitectura de Cambios

### Fase 1: Base visual y estructura (Tareas 001-002)

**001 - Logo y tema**
- Copiar `jq-logo.png` a `app/src/assets/` y `favicon.png` a `app/public/` (enlazarlo en `index.html`, retirando `favicon.svg`).
- `src/main.ts`/`src/lib/theme.ts`: `definePreset(Aura, { semantic: { primary: <paleta emerald> } })`.
- Fondo global `bg-surface-50` (`dark:bg-surface-950`) y fuente en `main.css`.

**002 - Reorganizar vistas y rutas anidadas**
- Mover a `src/views/auth/LoginView.vue` y `src/views/admin/DashboardView.vue` (reemplaza a `HomeView`); `NotFoundView` permanece en `src/views/`.
- `src/router/index.ts`: ruta padre `AuthLayout` (hijas `login`, `forgot-password`), ruta padre `AdminLayout` con `meta.requiresAuth` (hija `dashboard` en `/`), catch-all `not-found`. Cada ruta lleva `meta.title`.
- Layouts provisionales (solo `<RouterView />`) para que el router compile hasta las tareas 003 y 005.

### Fase 2: Autenticación (Tareas 003-004)

**003 - `AuthLayout`**
- `src/layouts/AuthLayout.vue`: contenedor a pantalla completa centrado y tarjeta `max-w-md`, `rounded-2xl`, borde y sombra suaves; muestra el logo centrado y un `<RouterView />` con el contenido de la vista.
- `src/components/AuthHeading.vue`: título (`h1`) y subtítulo por props, usado por cada vista de auth para mantener el mismo estilo.

**004 - Vistas de auth**
- `LoginView` adaptada al layout (etiqueta «Correo», enlace «¿Olvidaste tu contraseña?»).
- `ForgotPasswordView`: campo de correo, botón «Enviar enlace» (`:loading`), enlace «Volver a iniciar sesión». Tras enviar muestra siempre el mismo mensaje de éxito, exista o no el correo.
- `useAuth.requestPasswordReset(email)` → `pb.collection('users').requestPasswordReset(email)`.

### Fase 3: Administración (Tareas 005-006)

**005 - `AdminLayout`**
- `src/layouts/AdminLayout.vue` con `SidebarLayout`, `Sidebar` (`variant="floating"`, `collapsible="icon"` en escritorio; `overlay` + `collapsible="offcanvas"` y cerrada por defecto en móvil) y `SidebarBackdrop` solo en móvil.
- `src/composables/useMediaQuery.ts` (envoltura de `matchMedia`, con limpieza) para `isMobile` (`max-width: 767px`).
- `src/layouts/admin-nav.ts`: grupos `Análisis`, `Operaciones`, `Ajustes`, `Facturación` con `label`, `icon` (`pi pi-*`), `to` y `badge` opcional.
- Cabecera con `SidebarTrigger` y título de `route.meta.title`; pie con `Avatar` (iniciales) y `Menu` emergente (correo, Ajustes, Notificaciones, Cerrar sesión).
- Contenido en `<RouterView />` dentro de `SidebarMain`.

**006 - Dashboard, pruebas, documentación y verificación**
- `DashboardView`: título «Panel de administración» y bloque de ejemplo.
- Pruebas: actualizar `router/index.test.ts` (nombres y rutas anidadas), añadir `useAuth.requestPasswordReset`, `admin-nav` (rutas únicas y válidas) y `useMediaQuery`.
- `README.md` de `app/`: secciones de layouts y de cómo añadir una vista de auth o admin.
- `scripts/verify-app.sh` en verde; marcar la feature como completada.

---

## Impacto por Módulo

| Ruta | Cambio |
|------|--------|
| `app/src/layouts/` | `AuthLayout.vue`, `AdminLayout.vue`, `admin-nav.ts` |
| `app/src/views/{auth,admin}/` | `LoginView`, `ForgotPasswordView`, `DashboardView` |
| `app/src/components/` | `AuthHeading.vue` |
| `app/src/composables/` | `useAuth` (`requestPasswordReset`), `useMediaQuery` |
| `app/src/router/index.ts` | Rutas anidadas y `meta.title` |
| `app/src/{main.ts,styles/main.css}`, `app/index.html` | Tema, fondo y favicon |
| `app/src/assets/`, `app/public/` | Logo y favicon |
| `app/README.md` | Documentación de layouts |
| `api/`, `web/` | Sin cambios |

---

## Flujos Críticos

### Flujo 1: Recuperar contraseña
```
1. Usuario abre /forgot-password (dentro de AuthLayout) y envía su correo
2. La vista llama a requestPasswordReset → PocketBase responde 204 exista o no el correo
3. Resultado: mensaje de éxito neutro; el formulario no revela si la cuenta existe
```

### Flujo 2: Navegación en administración
```
1. Usuario autenticado abre / → AdminLayout con barra lateral y DashboardView
2. En escritorio el botón de cabecera colapsa la barra a iconos; en móvil abre un panel superpuesto con fondo oscurecido
3. Pulsar el fondo o un enlace del menú cierra el panel (móvil)
4. Resultado: la ruta activa queda resaltada y el título de la cabecera sigue a meta.title
```

### Flujo 3: Cerrar sesión desde el menú de usuario
```
1. Usuario abre el menú del pie y elige «Cerrar sesión»
2. logout() limpia pb.authStore y el router lleva a /login
3. Resultado: las rutas de AdminLayout vuelven a exigir sesión
```

---

## Notas de Implementación

### Decisiones
- **Componentes `Sidebar*` nativos de PrimeVue 5** en lugar de construir la barra a mano: dan variante flotante, modo icono, accesibilidad y teclado.
- **Detección de móvil en la app (`useMediaQuery`)**: PrimeVue no la hace; evita duplicar la barra y mantiene una sola fuente de verdad.
- **Layouts como rutas padre** con `<RouterView />` (no envolver cada vista): el layout persiste entre navegaciones y la protección se declara una vez (`meta.requiresAuth` en el padre; el guard debe comprobar `to.matched.some(...)`).
- **Logo de `web/`** copiado (no referenciado entre proyectos) para que `app/` sea autocontenida. La captura de referencia usa otro logotipo («PrepFlow»); aquí se usa el de JQ Fitness.
- **Textos en español**; sin i18n (fuera de alcance).
- **Primario esmeralda**: la referencia usa botones verdes; se define en el preset, no con clases sueltas.

### Convención de código
- Un layout por archivo en `src/layouts/`; las vistas no incluyen estructura de página, solo su contenido.
- Vistas por área: `views/auth/`, `views/admin/`; sufijo `View`.
- Navegación de admin solo en `admin-nav.ts`.

### Seguridad
- `requestPasswordReset` no distingue cuentas existentes en la UI.
- El guard comprueba rutas padre (`to.matched`) para no dejar hijas sin proteger.
- El menú de usuario no muestra más datos que el correo.

### Referencias
- https://primevue.org/ (componentes Sidebar, Menu, Avatar)
- https://router.vuejs.org/guide/essentials/nested-routes.html
- https://pocketbase.io/docs/authentication/#password-reset

### Licencia de PrimeVue 5
- PrimeVue 5 exige una clave de licencia (comunitaria gratuita para quien cumpla los criterios; comercial en otro caso) y muestra el aviso «Invalid PrimeUI License» si falta. Se añadió `VITE_PRIMEVUE_LICENSE` (opcional) que se pasa como `license` al plugin. No se oculta ni se elude el aviso. **Decisión pendiente del usuario:** obtener la clave o volver a PrimeVue 4 (MIT).

### Fuera de alcance
- Módulos de negocio, ajustes y notificaciones reales (las entradas de menú son marcadores).
- Registro, verificación de correo y página de restablecimiento con token.
- i18n, modo oscuro conmutable por el usuario y subida de avatar.

---

## Criterios de Aceptación

- [x] `/login` y `/forgot-password` se muestran en una tarjeta centrada con el logo, similar a la referencia, también en móvil.
- [x] `ForgotPasswordView` envía la solicitud y muestra un mensaje neutro; los errores de red muestran un aviso genérico.
- [x] `/` muestra `AdminLayout` con barra flotante, grupos, iconos, badges, ruta activa resaltada y menú de usuario funcional.
- [x] En escritorio la barra se colapsa a iconos; por debajo de 768 px es un panel superpuesto con fondo y se cierra al pulsar fuera o al navegar.
- [x] Sin sesión, cualquier hija de `AdminLayout` redirige a `/login?redirect=...`.
- [x] Las vistas viven en `views/auth/` y `views/admin/`; los layouts en `layouts/`.
- [x] `scripts/verify-app.sh` termina en verde.

---

## Dependencias Entre Tareas

```
Feature 003 (app base)       → 001, 002
001 (logo y tema)            → 003, 005
002 (vistas y rutas)         → 003, 004, 005, 006
003 (AuthLayout)             → 004
005 (AdminLayout)            → 006
004, 005                     → 006 (dashboard, pruebas y cierre)
```

---

## Validación Post-Deploy

1. `scripts/verify-app.sh` en verde.
2. `cd app && bun run dev`: abrir `/login` y `/forgot-password`, comparar con la referencia.
3. Iniciar sesión: ver el admin, colapsar la barra, abrir el menú de usuario y cerrar sesión.
4. Reducir la ventana a <768 px: la barra pasa a panel superpuesto.
5. Abrir `/` sin sesión: redirige a `/login?redirect=%2F`.

---

## Prompt y modelo utilizado

### Modelo

Sonnet 5.5

### Prompt

```
Para las interfaces de auth crea un Layout para que el diseño responda a algo parecido a esta interfaz [captura: «Forgot password» en tarjeta centrada con logo], puedes usar el logo.

Y deja un layout listo para admin que luzca parecido a esta [capturas: barra lateral flotante con grupos, badges y menú de usuario; versión móvil con panel superpuesto].

Para organizar las vistas podemos ordenar en layouts/... views/admin/..., views/auth/...
```
