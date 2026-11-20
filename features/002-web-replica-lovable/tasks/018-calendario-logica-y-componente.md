# 018 - [Web] Lógica y componente del calendario de clases

- **Prioridad:** 18
- **Estado:** Completado
- **Depende de:** 001, 003, 004, 005
- **Fase:** Fase 4: Páginas interactivas

## Objetivo

Existe un componente de calendario semanal que filtra por servicio, navega por semanas y muestra el estado de cada clase, con la lógica de fechas y cupos aislada en funciones puras probadas.

## Contexto

Usa `classTemplates`, `availability` (003), el diccionario (004) y `use-lang` (005). El original calcula los cupos de forma determinista (no hay backend): `taken = Math.floor((Math.sin(seed) + 1) / 2 * (capacity + 1))` con `seed = (fecha.getTime() / 864e5) + time.length + day`, y `spotsLeft = capacity - taken`. La semana empieza en domingo a las 00:00 locales: `inicio = hoy 00:00 − getDay() días + offset × 7 días`. El offset nunca baja de 0.

Marcado del original:
- Barra superior `flex flex-wrap items-center justify-between gap-4`: filtros `All`, `Group Strength`, `Tropical Jump` (`rounded-full border px-4 py-2 text-sm font-bold`; activo `border-primary bg-primary text-primary-foreground`, inactivo `border-border text-muted-foreground`) y navegador de semanas (botón anterior con `aria-label="Previous week"`, texto `text-sm font-bold` con el rango `Nov 15 – Nov 21`, botón siguiente con `aria-label="Next week"`; botones `rounded-full border border-border p-2` con flecha de 16 px).
- Lista `mt-8 space-y-4`: por cada día con clases tras el filtro, `div.grid.gap-3.md:grid-cols-[140px_1fr]` con cabecera (`p.font-display.text-3xl.uppercase` abreviatura `Sun…Sat` y `p.text-sm.text-muted-foreground` fecha `November 16`) y rejilla `grid gap-3 sm:grid-cols-2 lg:grid-cols-3` de tarjetas `card-surface p-5`: hora (`font-display text-2xl`), servicio (`font-semibold`), coach (`text-xs text-muted-foreground`), estado a la derecha (`text-xs font-bold uppercase`; `full` → `text-destructive`, `almost` → `text-accent`, `available` → `text-primary`; textos `full`, `almost`, `available` del diccionario), `p.mt-3.text-sm.text-muted-foreground` `{spotsLeft} / {capacity} {spots}` y enlace a `/contact` `btn mt-4 w-full !py-2` (`btn-outline` con `waitlist` si está llena; `btn-primary` con `reserve` si no).

## Alcance

- Crear `web/src/lib/schedule.ts` (puro; la fecha actual se recibe como parámetro):
  - `weekStart(today: Date, offset: number): Date`.
  - `weekDays(start: Date): Date[]` (7 días).
  - `spotsLeft(date: Date, tpl: ClassTemplate): number` con la fórmula anterior.
  - `classesForDay(dayIndex: number, filter: 'All' | ClassTemplate['service']): ClassTemplate[]`.
  - `formatRange(start: Date, end: Date, locale?: string): string`.
- Crear `web/src/components/ScheduleBoard.vue` que usa esas funciones con `new Date()` al montar; el botón anterior se deshabilita en offset 0 (equivalente a `Math.max(0, offset − 1)`); textos traducibles con `t()`.
- Pruebas `web/src/lib/schedule.test.ts` (fechas fijas): `weekStart` para un jueves y un domingo, con offset 0 y 1; `spotsLeft` siempre entre 0 y `capacity` para 60 fechas consecutivas y estable ante dos llamadas; `classesForDay` con y sin filtro (martes: 3 Group Strength; lunes con filtro `Group Strength`: vacío). Pruebas `ScheduleBoard.test.ts` con `vi.setSystemTime`: filtro `Tropical Jump` deja solo lunes, miércoles y sábado; el botón siguiente cambia el rango; el anterior no baja de la semana actual; una clase con 0 cupos muestra `Full` y `Join waitlist`.
- Límites: sin página (tarea 019).

## Criterios de aceptación

- [x] `spotsLeft` devuelve valores enteros en `[0, capacity]` y el mismo valor para la misma fecha y plantilla.
- [x] Con la fecha del sistema fijada, el filtro `Tropical Jump` muestra los 3 días con esa clase, y `Group Strength` martes y jueves con 3 clases cada uno.
- [x] El botón anterior no permite semanas anteriores a la actual; el siguiente actualiza el rango de fechas mostrado.
- [x] Las tarjetas muestran color y botón según el estado (`Full` → `btn-outline` `Join waitlist`; resto → `btn-primary` `Reserve`) y todos los botones enlazan a `/contact`.
- [x] Al cambiar a ES, `Full`, `Available`, `Almost full`, `spots left`, `Reserve` y `Join waitlist` pasan a su traducción.
- [x] `bun run lint`, `bun run format:check`, `bun run check`, `bun run test` y `bun run build` pasan en verde.

## Referencias

- `features/002-web-replica-lovable/spec.md`, "Fase 4" y "Decisiones" → tarea 018.
- `features/002-web-replica-lovable/reference/html/schedule.html` (captura renderizada de una semana).

## Fuera de alcance

- La página `/schedule` y su hidratación (tarea 019).
- Reservas reales y cupos desde backend.

## Notas de implementación

<!-- Vacío al crear la tarea. -->
