# 024 - [Pruebas] Completitud del catálogo y limpieza

- **Prioridad:** 24
- **Estado:** Pendiente
- **Depende de:** 008, 009, 010, 011, 012, 013, 014, 015, 016, 017, 018, 023
- **Fase:** Fase final: Verificación y cierre

## Objetivo

No queda texto en español fuera de `es.json` y el catálogo está completo, ordenado y sin claves huérfanas.

## Contexto

Tras la migración por módulo pueden quedar literales en `lib/`, `composables/`, `components/` o atributos (`title`, `alt`, `aria-label`, `placeholder`) que el extractor no ve.

## Alcance

- Barrido con `grep -rnP "[áéíóúñÁÉÍÓÚÑ¿¡]" app/src` excluyendo `es.json`, `*.test.ts` y datos; revisar también palabras en español sin tilde (lista de verificación: «Guardar», «Cancelar», «Eliminar», «Buscar», «Nuevo»).
- Corregir lo hallado y eliminar claves huérfanas; ejecutar `i18n:sort`.
- Prohibir `v-html` con `t()` (regla ESLint o revisión con `grep`) y registrar la regla.
- Convertir el barrido en una verificación de `i18n:check` (opción `--spanish-literals`) que falle ante acentos en cadenas fuera de `es.json`.

## Criterios de aceptación

- [ ] `cd app && bun run lint`, `bun run typecheck` y `bun run test` pasan en verde.
- [ ] `bun run i18n:check` pasa en verde (sin claves faltantes ni huérfanas).
- [ ] `grep` de literales en español en `app/src` (salvo `es.json`, pruebas y fixtures) no devuelve coincidencias.
- [ ] `i18n:check --spanish-literals` falla ante una cadena con acento agregada a propósito.

## Referencias

- `features/021-internacionalizacion-app/spec.md`, «Fase final».

## Fuera de alcance

- Pruebas de idioma (025).

## Notas de implementación

