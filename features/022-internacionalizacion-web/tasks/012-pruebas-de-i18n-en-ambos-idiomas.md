# 012 - [Pruebas] Pruebas de i18n en ambos idiomas

- **Prioridad:** 12
- **Estado:** Completado
- **Depende de:** 011
- **Fase:** Fase final: Verificación y cierre

## Objetivo

La suite verifica el comportamiento bilingüe de punta a punta: módulo, puente cliente, componentes, formatos, catálogo y build estático.

## Contexto

Las pruebas existentes corren en `en` (idioma por defecto) y siguen afirmando texto inglés. Cada tarea 004-010 añadió casos puntuales; falta una cobertura transversal y la verificación del build (`tests/dist/*`), que hoy solo comprueba HTML en inglés y no ve el chunk `es`.

## Alcance

- Helper de pruebas `web/src/test/i18n.ts` (o similar): `useLocale('es')` que fija el idioma y lo restablece a `en` en `afterEach`.
- Cobertura transversal en `es`: `Header` (selector, `aria-pressed`, `aria-label`), `PricingGrid` (descriptores, plurales, `Free`, nombre/nota del API intactos), `ScheduleBoard` (filtros, estados, hora 24 h, filtro conservado al cambiar idioma, mensajes de carga/error/vacío), `LeadForm` (placeholders, opciones, éxito), formateadores (`formatPrice`, `formatTime`, `formatRange`, días).
- Puente cliente: texto con parámetros, atributos, `<title>`, `<html lang>`, clave desconocida, `localStorage` bloqueado, y persistencia/lectura de `jq-lang`; `navigator.language = es-MX` sin `jq-lang` → `es`.
- `tests/dist/routes.test.ts`: cada página generada contiene `data-i18n` en el texto traducible; el HTML en inglés no cambia; el build incluye `es.json` como chunk independiente (no en el bundle inicial); sin referencias a texto de claves camelCase antiguas. `test:build:offline` sigue en verde.
- Límites: no se modifica código de producción salvo correcciones de bugs que las pruebas descubran (anotarlas en notas).

## Criterios de aceptación

- [x] `cd web && bun run test` y `bun run test:dist` pasan en verde.
- [x] `bun run test:build:offline` en verde.
- [x] Hay al menos un caso `es` por componente, por formateador y por rama del puente cliente.
- [x] Las pruebas restablecen el idioma a `en` (sin dependencia de orden entre archivos).

## Referencias

- `features/022-internacionalizacion-web/spec.md`, «Fase final» → tarea 012.
- `web/vitest.config.ts`, `web/tests/dist/routes.test.ts`, `web/tests/dist/build-offline.ts`.

## Fuera de alcance

- Pruebas en navegador real (se cubren en la validación post-deploy).

## Notas de implementación

Pasaron 79 pruebas unitarias y de componentes, 28 de dist y los builds con API válida, clave rechazada y API inalcanzable. Se comparte el restablecimiento del idioma entre suites. Las nuevas pruebas verifican títulos y marcadores con claves válidas en las diez rutas, chunk español separado, hora canónica, huso del negocio, cupo singular, carga/vacío y datos de atributos seguros.
