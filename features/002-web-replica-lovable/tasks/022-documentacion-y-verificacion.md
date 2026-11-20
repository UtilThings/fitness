# 022 - [Docs] Documentación y script de verificación

- **Prioridad:** 22
- **Estado:** Completado
- **Depende de:** 001, 002, 003, 004, 005, 006, 007, 008, 009, 010, 011, 012, 013, 014, 015, 016, 017, 018, 019, 020, 021
- **Fase:** Fase final: Verificación y cierre

## Objetivo

El `README.md` de `web/` describe el sitio real (rutas, estructura, idioma, componentes) y `scripts/verify-web.sh` comprueba toda la feature con un solo comando.

## Contexto

`web/README.md` aún habla de la demo del contador ("pulsa Incrementar") y de la estructura del boilerplate. `scripts/verify-web.sh` ejecuta `bun install --frozen-lockfile`, `lint`, `format:check`, `check`, `test` y `build`. La tarea 020 añadió `test:dist`.

## Alcance

- Actualizar `web/README.md`:
  - Eliminar la mención del contador y el paso "pulsa Incrementar"; sustituir por "abre las rutas de la tabla".
  - Tabla de las 9 rutas y la 404 con su archivo.
  - Estructura de carpetas (`components`, `layouts`, `lib`, `pages`, `scripts`, `styles`, `assets`) y qué contiene cada una.
  - Sistema de diseño: dónde están los tokens y las utilidades (`global.css`), y que las fuentes están autoalojadas.
  - Idioma: cómo funciona `data-i18n` y cómo añadir una clave al diccionario.
  - Formularios sin backend y calendario con cupos simulados (no son datos reales).
  - Scripts, incluido `test:dist` (requiere `bun run build` antes).
  - Qué se omitió del original (badge y panel de Lovable) y que la referencia vive en `features/002-web-replica-lovable/reference/`.
- Actualizar `scripts/verify-web.sh`: añadir `run_step bun run test:dist` después de `bun run build`, y un paso que falle si `grep -ri lovable dist` encuentra algo.
- Ejecutar `scripts/verify-web.sh` y anotar el resultado.
- Límites: no cambiar código de producto.

## Criterios de aceptación

- [x] `web/README.md` no menciona `Counter` ni "Incrementar" y documenta las 10 rutas, la estructura y el sistema de idioma.
- [x] Todos los comandos del README funcionan tal como están escritos.
- [x] `scripts/verify-web.sh` ejecuta lint, format, check, test, build, `test:dist` y la comprobación de `lovable`, y termina en verde.
- [x] `bun run lint`, `bun run format:check`, `bun run check`, `bun run test` y `bun run build` pasan en verde.

## Referencias

- `features/002-web-replica-lovable/spec.md`, "Fase final" y "Validación Post-Deploy" → tarea 022.
- `web/README.md` y `scripts/verify-web.sh` (versión de la feature 001).

## Fuera de alcance

- Documentación de despliegue y de integración con `api/`.

## Notas de implementación

Se ejecutó scripts/verify-web.sh de principio a fin. Pasaron lint, formato, tipos, las 35 pruebas unitarias, la compilación, las 12 pruebas del sitio compilado y la búsqueda de referencias a Lovable.
