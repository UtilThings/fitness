# JQ Fitness web

Sitio público de JQ Fitness en Astro, TypeScript, Vue 3 y Tailwind CSS v4. Astro genera el HTML estático. El header, los formularios, los precios y el calendario usan islas Vue.

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

Los formularios de contacto y coaching usan validación nativa y muestran una confirmación local. Las acciones de reserva y lista de espera del calendario enlazan a contacto.

## Catálogo y horario

- Durante el build, las páginas leen `GET /api/public/catalog` para el nombre y ciudad del negocio. Las páginas de precios y servicios incluyen los planes, su moneda y los horarios semanales en el HTML. Si falta la URL de la API, la clave es rechazada o la consulta falla, el build usa los datos de `src/lib/data.ts`.
- Al hidratarse, `PricingGrid` vuelve a consultar el catálogo. Si falla la revalidación, conserva los precios incrustados en el build. Los cambios de precio se reflejan en el navegador cuando vence la caché de la respuesta.
- `/schedule` consulta `GET /api/public/schedule?week=YYYY-MM-DD` al abrir o cambiar de semana. Las fechas usan la zona del negocio y los cupos se calculan con las reservas de cada clase. Ante un error, el calendario avisa, permite reintentar y muestra los horarios base con «Consulta disponibilidad».

Astro genera contenido apto para buscadores y Nginx sirve el HTML. Las islas actualizan los datos que cambian con frecuencia, por lo que el sitio puede seguir usando el despliegue estático. Reconstruye la imagen si cambian las páginas, el respaldo local, los horarios incrustados o las variables de build. Los precios que se muestran en el navegador se actualizan mediante la revalidación. Un nuevo build también actualiza los precios incrustados en el HTML.

Las peticiones al catálogo y al horario envían `X-Business-Key` y validan el contrato `version: 2`. Añade el origen del sitio en **Ajustes → Integración** del admin. Consulta la [guía de integración](../docs/multi-tenancy.md#conectar-un-sitio-y-rotar-la-clave).

## Estructura

| Ruta              | Contenido                                            |
| ----------------- | ---------------------------------------------------- |
| `public/`         | Recursos estáticos, incluido el favicon.             |
| `src/assets/`     | Imágenes y logo del sitio.                           |
| `src/components/` | Islas Vue y bloques Astro para componer las páginas. |
| `src/layouts/`    | Estructura compartida y metadatos.                   |
| `src/lib/`        | Planes, horario, entorno y pruebas.                  |
| `src/i18n/`       | Idioma compartido, atributos y catálogo en español.  |
| `src/pages/`      | Páginas que Astro convierte en rutas.                |
| `src/scripts/`    | Traducción de los textos estáticos en el navegador.  |
| `src/styles/`     | Tokens y estilos compartidos.                        |
| `tests/dist/`     | Pruebas del sitio compilado.                         |

`src/styles/global.css` reúne los tokens de color y tipografía y las clases compartidas como `.btn`, `.eyebrow`, `.card-surface` y `.hero-fade`. Anton y Barlow se sirven con el sitio mediante Fontsource.

Los snapshots y las imágenes de referencia viven en `features/002-web-replica-lovable/reference/`. El sitio excluye el panel del editor y el badge de Lovable.

## Internacionalización

Astro genera el HTML en inglés. En el navegador se usa la preferencia `jq-lang` o el idioma del navegador. El selector cambia el idioma sin recargar y el catálogo español se carga bajo demanda.

Usa la frase inglesa como clave de `<T>` en Astro o de `t()` en Vue. Agrega su traducción en `src/i18n/locales/es.json` y ejecuta `bun run i18n:check`. La [guía de internacionalización web](../docs/i18n-web.md) incluye ejemplos para cada capa.

## Variables de entorno

| Variable                | Uso                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| `PUBLIC_SITE_URL`       | URL absoluta del sitio. Obligatoria para compilar. En desarrollo usa `http://localhost:4321` si falta.       |
| `PUBLIC_API_URL`        | URL HTTP(S) base de PocketBase. Opcional. Un valor vacío activa el respaldo local.                           |
| `PUBLIC_BUSINESS_KEY`   | Clave pública del negocio. Obligatoria si se configura `PUBLIC_API_URL`. Visible en los archivos compilados. |
| `PUBLIC_API_TIMEOUT_MS` | Tiempo de espera por solicitud, entero entre 500 y 15000 ms. Predeterminado: 4000.                           |

Configura las variables en `web/.env` o en el entorno de compilación. Estas variables son públicas y Docker las recibe como argumentos de build. Para conectar el sitio en el despliegue, establece tanto la URL de PocketBase como la clave pública del negocio en los argumentos del servicio web.

```bash
docker build --build-arg PUBLIC_SITE_URL=https://fitness.example.com \
  --build-arg PUBLIC_API_URL=https://api.example.com \
  --build-arg PUBLIC_BUSINESS_KEY="$PUBLIC_BUSINESS_KEY" \
  --build-arg PUBLIC_API_TIMEOUT_MS=4000 -t jq-fitness-web .
```

## Scripts

Ejecuta estos comandos desde `web/`.

| Comando                      | Resultado                                                                     |
| ---------------------------- | ----------------------------------------------------------------------------- |
| `bun run dev`                | Inicia Astro en modo desarrollo con recarga.                                  |
| `bun run build`              | Genera el sitio estático en `dist/`.                                          |
| `bun run preview`            | Sirve el sitio generado.                                                      |
| `bun run astro --help`       | Muestra la ayuda de Astro.                                                    |
| `bun run lint`               | Ejecuta ESLint.                                                               |
| `bun run lint:fix`           | Aplica las correcciones automáticas de ESLint.                                |
| `bun run format`             | Formatea con Prettier.                                                        |
| `bun run format:check`       | Comprueba el formato sin editar archivos.                                     |
| `bun run check`              | Ejecuta `astro check`.                                                        |
| `bun run test`               | Ejecuta las pruebas unitarias.                                                |
| `bun run test:watch`         | Vuelve a ejecutar las pruebas al editar.                                      |
| `bun run i18n:check`         | Comprueba el catálogo y las marcas de traducción.                             |
| `bun run i18n:sort`          | Ordena el catálogo español por clave.                                         |
| `bun run test:dist`          | Verifica las rutas compiladas. Ejecuta antes `PUBLIC_API_URL= bun run build`. |
| `bun run test:build:offline` | Compila con clave válida, clave rechazada y API inalcanzable.                 |

Desde la raíz del repositorio, ejecuta `scripts/verify-web.sh` después de configurar el entorno. El script instala dependencias con el lockfile congelado, ejecuta lint, formato, tipos, verificación del catálogo y pruebas unitarias. También verifica el HTML compilado sin URL de API y ejecuta builds separados con clave válida, clave rechazada y API inalcanzable.

Para revisar el respaldo en el navegador, genera y sirve un build con `PUBLIC_API_URL=http://127.0.0.1:9` y cualquier valor no vacío en `PUBLIC_BUSINESS_KEY`. Abre `/pricing` para ver los planes base y `/schedule` para ver el aviso y los horarios sin números de cupos. También puedes detener una instancia local de PocketBase después de compilar con ella para comprobar que la isla de precios conserva los planes iniciales.
