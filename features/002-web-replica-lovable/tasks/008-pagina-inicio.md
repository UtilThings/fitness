# 008 - [Web] Página de inicio `/`

- **Prioridad:** 8
- **Estado:** Completado
- **Depende de:** 002, 004, 006, 007
- **Fase:** Fase 3: Páginas estáticas

## Objetivo

`/` replica la página de inicio del original en desktop y mobile: hero a pantalla casi completa, franja de lemas, programas, cifras y banda de primera clase gratis.

## Contexto

Usa el layout (006), los componentes (007), las imágenes (002) y `T` (004). Referencia: `reference/html/home.html`. Título `JQ Fitness — Stronger Every Day | Miramar, FL`; descripción `Personal training, small-group strength and Tropical Jump classes in Miramar, Florida. Book your class today.`

## Alcance

Modificar `web/src/pages/index.astro` con estas secciones:

1. **Hero**: `section.relative.-mt-16.flex.min-h-[92vh].items-end.overflow-hidden`; imagen `hero.jpg` (alt `Athlete training with a kettlebell at JQ Fitness`, 1920×1088, `absolute inset-0 h-full w-full object-cover object-center`, carga inmediata); `div.absolute.inset-0.hero-fade`; contenedor `relative mx-auto w-full max-w-7xl px-5 pb-20` con `p.eyebrow` "Miramar · Florida", `h1.mt-4.text-6xl.sm:text-8xl.lg:text-[9rem]` (`heroTitle`), `p.mt-6.max-w-xl.text-lg.text-muted-foreground` (`heroSub`) y dos botones: `btn btn-primary` a `/schedule` (`book`) y `btn btn-outline` a `/pricing` (`explore`).
2. **Franja**: `div.overflow-hidden.border-y.border-border.bg-surface.py-5` con `p.whitespace-nowrap.font-display.text-3xl.uppercase.text-muted-foreground`: `Strength • Energy • Community • Results • Strength • Energy • Community`, con los puntos alternando `text-primary` y `text-accent` (empieza por primario). Es texto estático, sin animación.
3. **Programas** (`Section`): eyebrow `programs`; `h2.mt-3.text-5xl.md:text-7xl` "Train your way."; rejilla `mt-12 grid gap-6 md:grid-cols-3` con 3 tarjetas `card-surface group overflow-hidden hover:-translate-y-1` (imagen `aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105`, perezosa, 1280×960; cuerpo `p-6` con `h3.text-3xl`, descripción `mt-2 text-muted-foreground` y `p.mt-4.text-sm.font-bold.uppercase.tracking-widest.text-primary` `learnMore` + ` →`):
   - Personal Training (`personal`) → `/personal-training`, `personal.jpg`, "1-on-1 and partner coaching built around your goals."
   - Group Strength (`group`) → `/group-strength-training`, `group.jpg`, "Max 6 people. Real coaching, real strength."
   - Tropical Jump (`jump`) → `/tropical-jump`, `jump.jpg`, "High-energy trampoline cardio. First class free."
   - Debajo, tarjeta `card-surface mt-6 flex flex-col justify-between gap-4 p-8 md:flex-row md:items-center` a `/online-coaching`: `h3.text-3xl` (`online`), "8–16 week programs with training plans, nutrition guidance and progress check-ins." y `span.btn.btn-accent` "Apply".
4. **Cifras** (`Section` con `grid gap-10 md:grid-cols-3`): tres `div.border-l-2.border-primary.pl-6` con `p.font-display.text-7xl.text-primary` y `p.mt-2.uppercase.tracking-widest.text-muted-foreground`: `6` "Max per strength class"; `1:1` "Personal coaching"; `7` "Weekly group classes".
5. **CtaBand**.

Límites: sin comportamiento nuevo.

## Criterios de aceptación

- [x] `dist/index.html` contiene el `<title>` indicado, un único `<h1>` con "Stronger every day." y los textos de las 5 secciones.
- [x] A 390 px las tarjetas de programas se apilan en una columna y el hero no produce scroll horizontal; a 1440 px son 3 columnas.
- [x] Los botones llevan a `/schedule` y `/pricing`; las tarjetas a sus 4 destinos.
- [x] Al cambiar a ES, el h1 pasa a "Más fuerte cada día." y el eyebrow a "Nuestros programas".
- [x] `bun run lint`, `bun run format:check`, `bun run check`, `bun run test` y `bun run build` pasan en verde.

## Referencias

- `features/002-web-replica-lovable/spec.md`, "Fase 3" → tarea 008.
- `features/002-web-replica-lovable/reference/html/home.html`

## Fuera de alcance

- Revisión píxel a píxel (tarea 021).

## Notas de implementación

Se verificó el HTML generado y la presentación a 390 px y 1440 px con Chromium.
