# JQ Fitness web

Sitio público de JQ Fitness en Astro, TypeScript, Vue 3 y Tailwind CSS v4. Astro genera el HTML estático. El header, los formularios y el calendario usan islas Vue.

## Requisitos e instalación

- Node.js 24, según `.nvmrc`. Si usas nvm, ejecuta `nvm install` y `nvm use` dentro de `web/`.
- Bun 1.4.3 para instalar dependencias y ejecutar scripts.

Desde la raíz del proyecto, ejecuta estos comandos en una instalación nueva.

```bash
cd web
bun install --frozen-lockfile
cp .env.example .env
bun run dev
```

Abre las rutas de la tabla en http://localhost:4321. Para revisar el sitio compilado, detén el servidor de desarrollo, ejecuta `bun run build` y luego `bun run preview`. Usa la dirección que muestra Astro.

## Rutas

| Ruta                       | Archivo de Astro                          |
| -------------------------- | ----------------------------------------- |
| `/`                        | `src/pages/index.astro`                   |
| `/personal-training`       | `src/pages/personal-training.astro`       |
| `/group-strength-training` | `src/pages/group-strength-training.astro` |
| `/tropical-jump`           | `src/pages/tropical-jump.astro`           |
| `/online-coaching`         | `src/pages/online-coaching.astro`         |
| `/schedule`                | `src/pages/schedule.astro`                |
| `/pricing`                 | `src/pages/pricing.astro`                 |
| `/about`                   | `src/pages/about.astro`                   |
| `/contact`                 | `src/pages/contact.astro`                 |
| Rutas inexistentes         | `src/pages/404.astro`                     |

Los formularios de contacto y coaching usan validación nativa y muestran una confirmación local. El calendario calcula cupos simulados por semana y enlaza a contacto para las reservas y la lista de espera.

## Estructura

| Ruta              | Contenido                                            |
| ----------------- | ---------------------------------------------------- |
| `public/`         | Recursos estáticos, incluido el favicon.             |
| `src/assets/`     | Imágenes y logo del sitio.                           |
| `src/components/` | Islas Vue y bloques Astro para componer las páginas. |
| `src/layouts/`    | Estructura compartida y metadatos.                   |
| `src/lib/`        | Planes, horario, diccionario, entorno y pruebas.     |
| `src/pages/`      | Páginas que Astro convierte en rutas.                |
| `src/scripts/`    | Traducción de los textos estáticos en el navegador.  |
| `src/styles/`     | Tokens y estilos compartidos.                        |
| `tests/dist/`     | Pruebas del sitio compilado.                         |

`src/styles/global.css` reúne los tokens de color y tipografía y las clases compartidas como `.btn`, `.eyebrow`, `.card-surface` y `.hero-fade`. Anton y Barlow se sirven con el sitio mediante Fontsource.

El HTML se genera en inglés. `T.astro` marca los textos traducibles con `data-i18n`. El selector guarda el idioma bajo `jq-lang` en `localStorage` y emite `jq-lang-change`. El script de cliente actualiza los elementos marcados y las islas Vue se sincronizan mediante `useLang`. Para añadir una traducción, agrega la misma clave a `en` y `es` en `src/lib/i18n.ts` y úsala con `<T k="clave" />` en Astro o `t('clave')` en Vue.

Los snapshots y las imágenes de referencia viven en `features/002-web-replica-lovable/reference/`. El sitio excluye el panel del editor y el badge de Lovable.

## Variables de entorno

| Variable          | Uso                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| `PUBLIC_SITE_URL` | URL absoluta del sitio. Obligatoria para compilar. En desarrollo usa `http://localhost:4321` si falta. |
| `PUBLIC_API_URL`  | URL absoluta de la API. Opcional.                                                                      |

Configura las variables en `web/.env` o en el entorno de ejecución. El prefijo `PUBLIC_` permite exponer el valor al navegador.

## Scripts

Ejecuta estos comandos desde `web/`.

| Comando                | Resultado                                         |
| ---------------------- | ------------------------------------------------- |
| `bun run dev`          | Inicia Astro en modo desarrollo con recarga.      |
| `bun run build`        | Genera el sitio estático en `dist/`.              |
| `bun run preview`      | Sirve el sitio generado.                          |
| `bun run astro --help` | Muestra la ayuda de Astro.                        |
| `bun run lint`         | Ejecuta ESLint.                                   |
| `bun run lint:fix`     | Aplica las correcciones automáticas de ESLint.    |
| `bun run format`       | Formatea con Prettier.                            |
| `bun run format:check` | Comprueba el formato sin editar archivos.         |
| `bun run check`        | Ejecuta `astro check`.                            |
| `bun run test`         | Ejecuta las pruebas unitarias.                    |
| `bun run test:watch`   | Vuelve a ejecutar las pruebas al editar.          |
| `bun run test:dist`    | Verifica las rutas compiladas. Requiere el build. |

Desde la raíz del repositorio, ejecuta `scripts/verify-web.sh` después de configurar el entorno. El script instala dependencias con el lockfile congelado, ejecuta lint, formato, tipos, pruebas unitarias y build, y verifica las rutas y la ausencia de referencias a Lovable en `dist/`.
