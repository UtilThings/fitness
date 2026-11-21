# 005 - [Componente] Precios y planes con build y revalidación en cliente

- **Prioridad:** 5
- **Estado:** Pendiente
- **Depende de:** 004
- **Fase:** Fase 3: Componentes y páginas

## Objetivo

Las páginas de precios y de servicios muestran planes y horarios reales de la API, renderizados en el build y revalidados en el navegador, con respaldo estático.

## Contexto

`web/` genera HTML estático (Astro + Nginx). `pricing.astro`, `personal-training.astro`, `group-strength-training.astro` y `tropical-jump.astro` importan `data.ts` directamente; `PricingCard.astro` renderiza un `Plan`. Decisión del spec: build con datos de la API (SEO y primera pintura sin JS) más isla Vue que revalida en cliente, sin pasar a SSR. Las páginas de grupo y jump derivan sus horarios de `classTemplates`.

## Alcance

- Crear `web/src/components/PricingGrid.vue` (misma presentación que `PricingCard.astro`: etiqueta «Most popular», precio con `formatPrice`, lista y botón) con props `plans`, `cta`, `to`, `featuredIndex?`; se monta con `client:load`; al montarse llama a `getCatalog()` y reemplaza los planes del grupo correspondiente si `source === 'api'`; conserva los planes iniciales si falla; sin saltos de maquetación (misma altura mientras revalida).
- Adaptar las cuatro páginas para obtener planes y horarios con `getCatalog()` en el frontmatter y pasar los planes iniciales a `PricingGrid`; derivar «horas de clase» de `classTemplates` del catálogo.
- Conservar `PricingCard.astro` solo si sigue en uso; si queda sin referencias, eliminarlo y sus imports.
- Pruebas Vitest de `PricingGrid.vue` con `fetch` simulado: render inicial con los planes del build, actualización con la API, conservación del valor inicial si la API falla, precio `0` → «FREE», una sola petición por montaje.
- Sin tocar formularios, contacto ni CTA existentes.

## Criterios de aceptación

- [ ] `bun run build` con la API disponible genera `dist/pricing/index.html` con los precios de la API; sin API (o sin `PUBLIC_API_URL`) genera los de `data.ts` y no falla.
- [ ] En el navegador, un precio cambiado en la API después del build se refleja en `/pricing` sin reconstruir.
- [ ] Las páginas de grupo y jump muestran sus horarios desde el catálogo.
- [ ] El aspecto de las tarjetas es idéntico al actual (mismas clases y estructura).
- [ ] `bun run lint`, `format:check`, `check` y `test` en `web/` pasan.

## Referencias

- `features/019-catalogo-publico-en-web/spec.md`, sección "Fase 3" → tarea 005, y "Decisiones".
- `web/src/components/PricingCard.astro`, `web/src/pages/pricing.astro`.
- https://docs.astro.build/en/reference/directives-reference/#client-directives

## Fuera de alcance

- Horario semanal con cupos (006).
- Traducción al español de los nombres de plan.
- Formularios y CTA de contacto.

## Notas de implementación

