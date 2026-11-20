# 021 - [Pruebas] Revisión visual desktop y mobile contra el original

- **Prioridad:** 21
- **Estado:** Completado
- **Depende de:** 020
- **Fase:** Fase final: Verificación y cierre

## Objetivo

Las 9 rutas (y la 404) se ven igual que el original a 1440 px y a 390 px de ancho, y las diferencias relevantes quedan corregidas.

## Contexto

Todas las páginas están implementadas y el HTML está verificado (020). El preview original es privado; el token del enlace caduca el 2026-11-23. Después de esa fecha, la comparación se hace contra `reference/html/*.html` (clases y textos) y `reference/assets/`. El token **no** se guarda en el repositorio ni en las notas: se pasa por variable de entorno temporal.

## Alcance

- Capturar a página completa las 9 rutas y la 404, en 1440×900 y 390×844, del original (con el token en la sesión del navegador) y de la réplica (`bun run preview`). Herramienta: Playwright ejecutado con `bunx playwright` (o Firefox headless si ya está disponible), sin añadir dependencias al proyecto; las capturas se guardan fuera del repositorio (por ejemplo `/tmp/jq-visual/`).
- Revisar cada par, como mínimo: altura del hero, tamaños de tipografía, espaciados, rejillas, imágenes, el header (nav completo en 1440 px, hamburguesa en 390 px, menú desplegado), el selector de idioma y el footer.
- Comprobar en 390 px que ninguna página tiene scroll horizontal (`document.documentElement.scrollWidth <= 390`).
- Comprobar el estado desplegado del menú móvil y el cambio a ES en `/`.
- Corregir las diferencias relevantes en los componentes/páginas afectados. Las diferencias aceptadas (por ejemplo, fuentes autoalojadas con ligero cambio de renderizado, o cupos distintos por la fecha) se anotan en las notas.
- Límites: sin rediseños; la referencia es el original.

## Criterios de aceptación

- [x] Existe un par de capturas (original y réplica) para cada una de las 10 pantallas en desktop y en mobile.
- [x] Ninguna página de la réplica tiene scroll horizontal a 390 px.
- [x] El header a 1279 px muestra hamburguesa y a 1280 px el nav completo (breakpoint `xl`), igual que el original.
- [x] Las diferencias encontradas están corregidas o listadas como aceptadas en las notas con su motivo.
- [x] El token de Lovable no aparece en ningún archivo del repositorio (`git grep -n "lovable_token"` solo puede coincidir con este texto y el spec si se menciona el nombre del parámetro, nunca un valor).
- [x] `bun run lint`, `bun run format:check`, `bun run check`, `bun run test` y `bun run build` pasan en verde.

## Referencias

- `features/002-web-replica-lovable/spec.md`, "Fase final" y "Validación Post-Deploy" → tarea 021.
- `features/002-web-replica-lovable/reference/`
- https://playwright.dev/docs/screenshots

## Fuera de alcance

- Pruebas de regresión visual automatizadas en CI.
- Rediseños no presentes en el original.

## Notas de implementación

Chromium generó 20 pares a 1440×900 y 390×844 en /tmp/jq-visual/. Se usó el HTML, CSS y los recursos originales guardados localmente. La referencia de la 404 se generó a partir del marcado del componente incluido en el bundle original. Se fijaron fecha y zona horaria del snapshot para comparar los cupos.

Las capturas coinciden en altura de página y geometría del header, hero, títulos, tarjetas y footer. Se ajustaron radios, bordes y transiciones para reproducir el CSS original. Se aceptaron variaciones menores de rasterización y compresión de imágenes. Se comprobó el menú a 1279 y 1280 px, la navegación móvil, la persistencia de ES y la ausencia de scroll horizontal a 390 px.
