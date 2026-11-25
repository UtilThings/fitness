# 025 - [Pruebas] Pruebas de i18n en ambos idiomas

- **Prioridad:** 25
- **Estado:** Completado
- **Depende de:** 004, 006, 023, 024
- **Fase:** Fase final: Verificación y cierre

## Objetivo

El comportamiento de idioma está cubierto por pruebas: detección, persistencia, cambio en caliente, formato y recorrido de vistas en `en` y `es`.

## Contexto

Las pruebas existentes corren en `es` (003). Faltan pruebas del idioma como funcionalidad y de las vistas en `en`.

## Alcance

- Pruebas en `app/src/i18n/*.test.ts` y `app/src/test/`: detección (`localStorage`, `navigator.language`, valor inválido), persistencia, `<html lang>`, título, `LocaleSwitcher`, locale de PrimeVue.
- Pruebas de formato: fecha, hora, número y moneda del `business` en ambos idiomas.
- Recorrido de humo: montar login, dashboard, clientes, pagos y reportes en `en` y verificar que no aparece texto del catálogo en español (comparando contra los valores de `es.json`).
- Prueba de cambio en caliente con una vista montada.

## Criterios de aceptación

- [x] `cd app && bun run lint`, `bun run typecheck` y `bun run test` pasan en verde.
- [x] El recorrido de humo falla si una vista de la lista muestra un valor de `es.json` estando en `en`.
- [x] Las pruebas no dependen del idioma del sistema ni de `localStorage` previo.

## Referencias

- `app/src/test/`

## Fuera de alcance

- Documentación (026).

## Notas de implementación

Lint, comprobación de tipos y suite completa en verde. Se montaron el acceso, dashboard, clientes, pagos y reportes con datos de prueba. Las pruebas verifican el texto inglés, el cambio en vivo, las preferencias, el diálogo de confirmación, y los formatos con CAD y America/Vancouver.
