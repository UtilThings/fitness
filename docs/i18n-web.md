# Internacionalización del sitio público

El HTML estático se genera en inglés. En el navegador, la preferencia `localStorage["jq-lang"]` tiene prioridad sobre `navigator.language`. Una variante como `es-MX` activa español. Los demás idiomas usan inglés. El selector de la cabecera guarda la elección y actualiza la página y sus islas sin recargar. La detección automática no guarda una preferencia.

`web/src/i18n/index.ts` comparte una instancia de vue-i18n. El catálogo `web/src/i18n/locales/es.json` es plano y se descarga al activar español. El compilador de mensajes permite interpolar y pluralizar las claves inglesas con `fallbackFormat`.

## Claves y catálogo

Escribe como clave la frase inglesa que debe ver el visitante. Conserva la puntuación y la capitalización. Agrega su traducción en `es.json` y conserva los nombres de los parámetros y la estructura de los plurales.

```json
{
  "Athlete training with a kettlebell at {name}": "Atleta entrenando con una pesa rusa en {name}",
  "Book your class": "Reserva tu clase",
  "{count} class | {count} classes": "{count} clase | {count} clases"
}
```

Usa `{'{'}`, `{'}'}`, `{'@'}` y `{'|'}` para mostrar esos caracteres literalmente. El signo `$` va directo. Si dos usos de la misma frase inglesa necesitan traducciones distintas, agrega el sufijo vacío `{''}` a una clave. Por ejemplo, `Full{''}` también se muestra como «Full» en inglés y tiene su propia entrada en español.

## Islas Vue

Usa `useLang()` en el componente y evalúa `t()` al renderizar. Si el texto depende de un estado, marca las claves en el mapa con `tl()` y resuélvelas con `translateKey()`. Las props de texto de `LeadForm` y `PricingGrid` también reciben claves marcadas con `tl()`.

```vue
<script setup lang="ts">
import { tl } from '@/i18n';
import { useLang } from '@/lib/use-lang';

const { t, translateKey } = useLang();
const labels = { ready: tl('Available'), full: tl('Full') };
</script>

<template>
  <p :aria-label="t('Schedule')">{{ translateKey(labels.ready) }}</p>
</template>
```

Las islas con HTML de servidor hidratan en inglés y adoptan el idioma compartido al montarse. Para las opciones de un formulario o los filtros, conserva un valor estable al traducir la etiqueta.

## Astro

Usa `<T k="…">` para texto y `params` para interpolar. Para una clave que viene de una lista marcada con `tl()`, usa `<T message={key} />`. `PageHero` y `BaseLayout` reciben descriptores `{ key, params }`.

```astro
---
import T from '@/components/T.astro';
import BaseLayout from '@/layouts/BaseLayout.astro';
import { tl } from '@/i18n';
import { i18nAttrs } from '@/i18n/attrs';

const name = 'JQ Fitness';
---
<BaseLayout
  title={{ key: tl("Class Schedule {'|'} {name}"), params: { name } }}
  description="See upcoming classes."
>
  <a href="/schedule"><T k="Book your class" /></a>
  <img
    src="/athlete.jpg"
    {...i18nAttrs({ alt: { key: 'Athlete training with a kettlebell at {name}', params: { name } } })}
  />
</BaseLayout>
```

`i18nAttrs()` genera el atributo inglés y los datos para traducir `alt`, `aria-label`, `placeholder` y `title`. Si el descriptor ya está marcado con `tl()`, usa `messageAttrs()`. `BaseLayout` aplica el mismo mecanismo al elemento `<title>`. El script cliente actualiza los textos con `textContent` y los atributos con `setAttribute`. Renderiza las traducciones con interpolación de Vue o Astro. Evita insertar traducciones como HTML.

## Catálogo y formatos

En `lib/`, genera descriptores para los textos de interfaz. Resuélvelos al mostrar. Una cadena que viene del negocio conserva su valor incluso si coincide con una clave de interfaz.

```ts
import { formatMessage, resolveText, tl, type Text } from '@/i18n';

const sessions: Text = {
  key: tl('{count} class | {count} classes'),
  params: { count: 8 },
};
resolveText(sessions, (key, params) => formatMessage(key, params, 'es'));
```

Usa `formatPrice(price, business.currency, lang)`, `formatTime(time, lang)` y `formatRange(start, end, lang)`. Los formateadores usan `en-US` o `es-US`. Las horas se conservan como `HH:mm` y se muestran en 12 h en inglés y en 24 h en español. Usa `LocalTime.astro` para una hora local en HTML estático y `weekdayKeys` para nombres de días. `weekStart()` calcula la semana con la zona horaria del negocio. Los filtros usan slugs y los precios usan la moneda del negocio.

Los nombres, notas, entrenadores y ciudad que llegan del API se muestran tal cual. Los nombres de planes, etiquetas y notas que genera el respaldo local se traducen. Se mantienen `EN` y `ES`, marcas como JQ Fitness y Tropical Jump, el nombre Coach JQ, los nombres geográficos, numerales y símbolos. Las imágenes decorativas conservan `alt=""`. Las descripciones y etiquetas Open Graph y Twitter siguen en inglés. Los nombres de marcas y códigos de idioma admitidos como literales están en `web/scripts/i18n-check.ts`.

## Verificación

Desde `web/`, ejecuta `bun run i18n:sort` y `bun run i18n:check`. El verificador revisa faltantes, huérfanas, duplicados, orden, interpolaciones, plurales y texto directo sin marcar en las plantillas. Desde la raíz, `bash scripts/verify-web.sh` incluye esa comprobación, pruebas y builds con y sin API.

El primer acceso en español puede mostrar brevemente el HTML inglés mientras se descarga el catálogo. El idioma se aplica en el navegador y las URL son las mismas en ambos idiomas.

## Agregar otro idioma

Añade el catálogo plano en `src/i18n/locales/` y amplía `supportedLocales`, `resolveLocale()` y la carga dinámica en `src/i18n/index.ts`. El selector se genera a partir de `supportedLocales`. Adapta el puente cliente para consultar el catálogo del idioma activo, añade la configuración regional y los formatos, y ejecuta el verificador sobre el nuevo catálogo. Añade pruebas de detección, cambio en caliente, persistencia y carga perezosa.
