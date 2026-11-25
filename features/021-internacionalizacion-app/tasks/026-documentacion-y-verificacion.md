# 026 - [Docs] Documentación y script de verificación

- **Prioridad:** 26
- **Estado:** Completado
- **Depende de:** 001, 002, 003, 004, 005, 006, 007, 008, 009, 010, 011, 012, 013, 014, 015, 016, 017, 018, 019, 020, 021, 022, 023, 024, 025
- **Fase:** Fase final: Verificación y cierre

## Objetivo

El equipo sabe cómo agregar texto o un idioma y `verify-app.sh` protege el catálogo en cada verificación.

## Contexto

`scripts/verify-app.sh` ejecuta lint, typecheck, tests y build del app. `docs/i18n.md` existe solo como borrador (001, 019).

## Alcance

- Completar `docs/i18n.md`: convención de claves, ejemplos (`t`, `<i18n-t>`, plurales, mapas con `tl`), trampas (escape de caracteres especiales, no concatenar), cómo agregar un texto, cómo agregar un idioma (loader, `supportedLocales`, PrimeVue locale, `i18n:check`), mensajes del API, y lo que queda fuera de alcance.
- Modificar `scripts/verify-app.sh` para ejecutar `bun run i18n:check` (incluida la opción `--api` y `--spanish-literals`).
- Actualizar `app/README.md` con la sección de i18n.
- Marcar los criterios del `spec.md` y su estado como Completado.

## Criterios de aceptación

- [x] `docs/i18n.md` y la sección del README existen y reflejan el comportamiento real.
- [x] `bash scripts/verify-app.sh` termina en verde e incluye `i18n:check`.
- [x] Todos los criterios de aceptación del spec están marcados.

## Referencias

- `features/021-internacionalizacion-app/spec.md`, «Criterios de Aceptación».

## Fuera de alcance

- Nuevos idiomas.

## Notas de implementación

Se completaron la guía y el README. verify-app.sh pasó con 361 pruebas, compilación y revisión del catálogo, y verify-api.sh pasó con 123 pruebas y la verificación de PocketBase. El recorrido en Edge verificó ambos idiomas con una sesión real en una instancia desechable. El spec está completado.
