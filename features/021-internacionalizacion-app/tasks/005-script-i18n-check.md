# 005 - [Pruebas] Script `i18n:check` de claves faltantes y huérfanas

- **Prioridad:** 5
- **Estado:** Pendiente
- **Depende de:** 002
- **Fase:** Fase 1: Fundamentos

## Objetivo

Existe un comando que falla cuando el catálogo `es.json` no coincide con las claves usadas en el código, dado que `missingWarn` está desactivado.

## Contexto

Con texto como clave, una clave sin traducción no da error (se ve en inglés). El script es la red de seguridad de toda la migración. Se ejecuta con bun, como los demás scripts de `scripts/`.

## Alcance

- Crear `app/scripts/i18n-check.ts`: recorre `src/**/*.{vue,ts}` (excluye `*.test.ts` y `src/test`) y extrae claves literales de `t('…')`, `$t('…')`, `te('…')`, `tl('…')` (marcador identidad para listas de claves, p. ej. `tl('Active')` en mapas de labels), `keypath="…"` y de `meta.title`.
- Compara con `src/i18n/locales/es.json`: falla por (a) clave usada sin traducción, (b) clave huérfana, (c) clave duplicada o `es.json` no ordenado, (d) variables `{x}` distintas entre clave y traducción, (e) llamadas a `t()` con argumento no literal (no extraíble).
- Exportar `tl` en `src/i18n/index.ts` (función identidad tipada) y añadir `"i18n:check"` y `"i18n:sort"` a `package.json`.
- Pruebas: `app/scripts/i18n-check.test.ts` con fixtures mínimos para cada tipo de fallo.
- Informa por ahora solo de las claves del catálogo inicial; las vistas se migran en 008-018.

## Criterios de aceptación

- [ ] `cd app && bun run lint`, `bun run typecheck` y `bun run test` pasan en verde.
- [ ] `bun run i18n:check` en verde con el catálogo actual y rojo ante cada fixture de fallo, con mensaje que indica archivo y clave.
- [ ] `bun run i18n:sort` ordena `es.json` de forma estable.

## Referencias

- `features/021-internacionalizacion-app/spec.md`, «Contrato de claves y uso».

## Fuera de alcance

- Integración con `scripts/verify-app.sh` (026).

## Notas de implementación

