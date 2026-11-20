# 020 - [Pruebas] Pruebas del HTML generado por ruta

- **Prioridad:** 20
- **Estado:** Completado
- **Depende de:** 008, 009, 010, 011, 012, 013, 014, 016, 017, 019
- **Fase:** Fase final: Verificación y cierre

## Objetivo

Una prueba automatizada recorre el sitio generado en `dist/` y confirma, para cada ruta, su título, su `h1`, sus enlaces internos y la ausencia de restos de Lovable.

## Contexto

Las 9 páginas y la 404 ya existen. `bun run test` ejecuta Vitest con happy-dom sobre `src/`; las pruebas sobre `dist/` necesitan que `bun run build` haya corrido antes, por lo que van en una configuración aparte para no romper `bun run test`.

## Alcance

- Crear `web/vitest.dist.config.ts` (entorno `node`, `include: ['tests/dist/**/*.test.ts']`) y el script `"test:dist": "vitest run --config vitest.dist.config.ts"` en `web/package.json`. Si `dist/` no existe, la prueba falla con un mensaje claro (`Ejecuta bun run build antes`).
- Crear `web/tests/dist/routes.test.ts` con una tabla de las 9 rutas (`dist/index.html`, `dist/<ruta>/index.html`) y `dist/404.html`, que verifica:
  - `<title>` exacto (tabla "Contrato de rutas" del spec).
  - Exactamente un `<h1>` con el texto esperado (`Stronger every day.`, `Coaching built for you.`, `Small group. Big results.`, `Jump. Sweat. Vibe.`, `Coaching anywhere.`, `Find your class.`, `Invest in stronger.`, `Built on community.`, `Let's get started.`; en la 404 el h1 es `404`).
  - `meta name="description"` presente y no vacía (salvo la 404).
  - Todo `href` interno (`/…`) apunta a una ruta existente en `dist/` o a un asset existente.
  - El header y el footer existen en las 9 rutas; la 404 no los tiene.
  - Ninguna página contiene la cadena `lovable` (sin distinguir mayúsculas) ni `gpteng`.
- Excluir `tests/` de `tsconfig`/ESLint si es necesario, o incluirlos con las reglas existentes; mantener `bun run lint` y `bun run check` en verde.
- Límites: no cambiar páginas; si una prueba falla por un defecto, corregir la página de origen y anotarlo en las notas.

## Criterios de aceptación

- [x] `bun run build && bun run test:dist` termina en verde con las 10 rutas verificadas.
- [x] Un enlace interno roto introducido a propósito (probar y revertir) hace fallar la prueba.
- [x] `bun run test` (sin build previo) sigue en verde y no ejecuta las pruebas de `dist/`.
- [x] `bun run lint`, `bun run format:check`, `bun run check`, `bun run test` y `bun run build` pasan en verde.

## Referencias

- `features/002-web-replica-lovable/spec.md`, "Fase final" y "Contrato de rutas" → tarea 020.
- https://vitest.dev/config/

## Fuera de alcance

- Pruebas de navegador (clic en el menú, hidratación): cubiertas por las pruebas de componentes y la tarea 021.

## Notas de implementación

Se verificaron las diez rutas y los componentes compartidos. Un enlace roto de prueba falló como se esperaba y se retiró. Sin dist, la suite unitaria pasó y test:dist mostró el mensaje previsto.
