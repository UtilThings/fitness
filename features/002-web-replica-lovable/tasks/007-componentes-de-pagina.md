# 007 - [Web] Componentes de página reutilizables

- **Prioridad:** 7
- **Estado:** Completado
- **Depende de:** 001, 002, 003, 004
- **Fase:** Fase 2: Layout compartido

## Objetivo

Los bloques que se repiten en las páginas (hero, sección, franja CTA, tarjeta de precio, tarjeta de políticas) existen como componentes Astro con las clases del original.

## Contexto

Dependen de los tokens (001), de `formatPrice` y `Plan` (003) y de `T.astro` (004). Marcado del original:

- **PageHero**: `section.relative.overflow-hidden`; imagen opcional `absolute inset-0 h-full w-full object-cover opacity-50` (alt vacío); `div.absolute.inset-0.hero-fade`; `div.relative.mx-auto.max-w-7xl.px-5.pb-16.pt-28.md:pt-40` con `p.eyebrow`, `h1.mt-3.max-w-4xl.text-5xl.md:text-8xl` y `p.mt-5.max-w-2xl.text-lg.text-muted-foreground`.
- **Section**: `section.mx-auto.max-w-7xl.px-5.py-16.md:py-24` más clases extra.
- **CtaBand**: `section.bg-primary.text-primary-foreground` > `div.mx-auto.flex.max-w-7xl.flex-col.items-start.justify-between.gap-6.px-5.py-16.md:flex-row.md:items-center` con `h2.text-4xl.md:text-6xl` (`ctaTitle`), `p.mt-3.max-w-xl.font-medium` (`ctaSub`) y enlace a `/schedule` `btn bg-background text-foreground hover:-translate-y-0.5` (`book`).
- **PricingCard**: `div.card-surface.flex.flex-col.p-7` (+ `border-primary` si es destacada); insignia `Most popular` (`mb-3 self-start rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase text-accent-foreground`); `h3.text-2xl`; precio `mt-4 font-display text-5xl text-primary`; unidad `text-sm text-muted-foreground`; `ul.my-6.space-y-2.text-sm` con `li.flex.gap-2` y un icono de check (`h-4 w-4 shrink-0 text-primary`) para `sessions`, `freq` y `note`; enlace `btn mt-auto` con `btn-primary` si es destacada o `btn-outline`.
- **PolicyCard**: `div.card-surface.p-7` con `p.eyebrow.mb-4` "Policies" y `ul.space-y-2.text-sm.text-muted-foreground` con `li` que empiezan por `• `.

## Alcance

- Crear en `web/src/components/`: `PageHero.astro` (props `eyebrow`, `title`, `sub`, `img?: ImageMetadata`), `Section.astro` (prop `class?`, slot), `CtaBand.astro`, `PricingCard.astro` (props `plan: Plan`, `featured?`, `cta?` por defecto `Inquire now`, `to?` por defecto `/contact`) y `PolicyCard.astro` (prop `items: string[]`, `title?` por defecto `Policies`).
- Imágenes con `<Image>` de `astro:assets`.
- Pruebas con `experimental_AstroContainer` de Astro en `web/src/components/page-components.test.ts` (si el contenedor no funciona bajo Vitest, documentar la limitación en las notas y verificar el HTML mediante la tarea 020): precio `$1,080`, `FREE` para precio 0, insignia solo con `featured`, `note` renderizada, `PolicyCard` con prefijo `• `.
- Límites: sin páginas.

## Criterios de aceptación

- [x] `PricingCard` con `price: 1080` muestra `$1,080`, y con `price: 0` muestra `FREE`.
- [x] La insignia `Most popular` y la clase `border-primary` aparecen solo con `featured`.
- [x] `CtaBand` muestra el título y subtítulo vía `<T>` y un enlace a `/schedule`.
- [x] `PageHero` sin `img` no renderiza `<img>`.
- [x] `bun run lint`, `bun run format:check`, `bun run check`, `bun run test` y `bun run build` pasan en verde.

## Referencias

- `features/002-web-replica-lovable/spec.md`, "Fase 2" → tarea 007.
- `features/002-web-replica-lovable/reference/html/pricing.html` y `personal-training.html`.
- https://docs.astro.build/en/reference/container-reference/

## Fuera de alcance

- Composición de páginas (tareas 008-019).

## Notas de implementación

Astro Container devolvió NoMatchingRenderer bajo Vitest. Se verificó el HTML de los componentes en una ruta de prueba temporal de Astro y se retiró esa ruta. Las pruebas de dist vuelven a cubrir su uso en las páginas.
