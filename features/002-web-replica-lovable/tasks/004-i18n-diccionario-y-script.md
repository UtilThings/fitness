# 004 - [Web] Diccionario i18n, componente `T` y script cliente

- **Prioridad:** 4
- **Estado:** Completado
- **Depende de:** Feature 001 (boilerplate web)
- **Fase:** Fase 1: Fundamentos

## Objetivo

El sitio puede mostrar los textos del diccionario en inglés o español: las páginas marcan los textos con `data-i18n`, y un script cliente aplica el idioma guardado y reacciona al cambio de idioma.

## Contexto

El original tiene un diccionario `{ en, es }` de 26 claves y guarda la elección en `localStorage['jq-lang']`. Las páginas Astro se prerenderizan en inglés y el script cliente cambia el texto tras cargar. El diccionario no cubre todo el contenido, solo nav, hero de inicio, CTA y etiquetas del horario. Las islas Vue leerán el idioma con el composable de la tarea 005.

## Alcance

- Crear `web/src/lib/i18n.ts` (puro, sin acceder a `window`):
  - `type Lang = 'en' | 'es'`, `STORAGE_KEY = 'jq-lang'`, `LANG_EVENT = 'jq-lang-change'`, `dictionary` y `type Key = keyof typeof dictionary.en`.
  - Claves `en`: `home` Home, `personal` Personal Training, `group` Group Strength, `jump` Tropical Jump, `online` Online Coaching, `schedule` Schedule, `pricing` Pricing, `about` About, `contact` Contact, `login` Client Login, `heroTitle` Stronger every day., `heroSub` Personal training, strength classes, and high-energy workouts designed to help you become your strongest self., `book` Book your class, `explore` Explore memberships, `programs` Our programs, `learnMore` Learn more, `viewSchedule` View schedule, `ctaTitle` Your first class is on us., `ctaSub` Try Tropical Jump or a Group Strength intro class free. No pressure — just energy., `inquire` Inquire now, `spots` spots left, `full` Full, `almost` Almost full, `available` Available, `reserve` Reserve, `waitlist` Join waitlist.
  - Claves `es`: `home` Inicio, `personal` Entrenamiento Personal, `group` Fuerza en Grupo, `jump` Tropical Jump, `online` Coaching Online, `schedule` Horario, `pricing` Precios, `about` Nosotros, `contact` Contacto, `login` Acceso Clientes, `heroTitle` Más fuerte cada día., `heroSub` Entrenamiento personal, clases de fuerza y entrenamientos de alta energía para ayudarte a ser tu versión más fuerte., `book` Reserva tu clase, `explore` Ver membresías, `programs` Nuestros programas, `learnMore` Ver más, `viewSchedule` Ver horario, `ctaTitle` Tu primera clase es gratis., `ctaSub` Prueba Tropical Jump o una clase introductoria de Fuerza en Grupo. Sin presión — solo energía., `inquire` Consultar, `spots` cupos, `full` Lleno, `almost` Casi lleno, `available` Disponible, `reserve` Reservar, `waitlist` Lista de espera.
  - `translate(lang: Lang, key: Key): string`, `isLang(value: unknown): value is Lang`, `readStoredLang(storage: Pick<Storage, 'getItem'>): Lang` (devuelve `en` si el valor falta o no es válido) y `storeLang(storage: Pick<Storage, 'setItem'>, lang: Lang): void`.
- Crear `web/src/components/T.astro`: prop `k: Key`; renderiza `<span data-i18n={k}>{translate('en', k)}</span>`.
- Crear `web/src/scripts/i18n-client.ts`: al cargar, lee el idioma con `readStoredLang(localStorage)`, y aplica `translate` al `textContent` de cada `[data-i18n]`. No modifica `<html lang>`, que se mantiene `en` (decisión del spec). Escucha `LANG_EVENT` en `window` (detail: `Lang`) y reaplica. Debe tolerar `localStorage` no disponible.
- Pruebas en `web/src/lib/i18n.test.ts`: ambas lenguas tienen exactamente las mismas 26 claves, `translate('es', 'book')` es `Reserva tu clase`, `readStoredLang` con valores `es`, `en`, `fr`, `null`, y `storeLang` escribe en `jq-lang`. Prueba del script con happy-dom: un `<span data-i18n="book">` cambia al emitir el evento con `es`.
- Límites: no incluir selector de idioma ni composable Vue (tarea 005).

## Criterios de aceptación

- [x] `dictionary.en` y `dictionary.es` tienen las mismas 26 claves (prueba automatizada).
- [x] `readStoredLang` devuelve `en` ante un valor inválido o ausente.
- [x] Con happy-dom, al despachar `jq-lang-change` con `es`, un elemento `[data-i18n="book"]` pasa a `Reserva tu clase`.
- [x] `<T k="book" />` renderiza `<span data-i18n="book">Book your class</span>` en el HTML generado.
- [x] `bun run lint`, `bun run format:check`, `bun run check`, `bun run test` y `bun run build` pasan en verde.

## Referencias

- `features/002-web-replica-lovable/spec.md`, "Contrato de datos" y "Decisiones" → tarea 004.
- https://docs.astro.build/en/guides/client-side-scripts/

## Fuera de alcance

- Selector EN/ES y menú móvil (tarea 005).
- Inclusión del script en el layout (tarea 006).

## Notas de implementación

El diccionario original contiene 26 claves por idioma. Se corrigió el recuento del spec y se comprobó el HTML de T en una ruta temporal.
