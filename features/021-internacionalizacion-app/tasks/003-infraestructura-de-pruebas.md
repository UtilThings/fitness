# 003 - [Pruebas] Infraestructura de pruebas con i18n

- **Prioridad:** 3
- **Estado:** Pendiente
- **Depende de:** 002
- **Fase:** Fase 1: Fundamentos

## Objetivo

Las pruebas existentes siguen verdes sin reescribirlas y existe un helper para montar componentes en `es` o `en`.

## Contexto

`vitest.config.ts` usa `happy-dom` y no tiene `setupFiles`. Unas 60 pruebas afirman texto en español y varias montan componentes con `PrimeVue` y `ToastService`. Como el texto fuente pasará a inglés (010-018), las pruebas deben ejecutarse con `es` activo.

## Alcance

- Crear `app/src/test/setup.ts` y registrarlo en `setupFiles`: carga `es.json` de forma síncrona y fija `es` antes de cada archivo de prueba; limpia `localStorage`.
- Crear `app/src/test/i18n.ts` con `i18nPlugin` (para `global.plugins`) y `withLocale(locale)` para cambiar el idioma dentro de una prueba y restaurarlo.
- Documentar en comentario la regla: las pruebas afirman el español salvo las de i18n (025).
- No modifica aserciones de pruebas existentes.

## Criterios de aceptación

- [ ] `cd app && bun run lint`, `bun run typecheck` y `bun run test` pasan en verde.
- [ ] Una prueba nueva `app/src/test/i18n.test.ts` demuestra `withLocale('en')` y `withLocale('es')` sobre `t`.
- [ ] Ninguna prueba existente cambió sus aserciones.

## Referencias

- `app/vitest.config.ts`
- https://vitest.dev/config/#setupfiles

## Fuera de alcance

- Pruebas de idioma completas (025).

## Notas de implementación

