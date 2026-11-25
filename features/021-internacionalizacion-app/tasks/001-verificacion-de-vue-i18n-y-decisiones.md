# 001 - [Pruebas] Verificación de vue-i18n y decisiones de claves

- **Prioridad:** 1
- **Estado:** Pendiente
- **Depende de:** Ninguna
- **Fase:** Fase 1: Fundamentos

## Objetivo

Se conoce, con evidencia sobre la versión instalada, cómo se comporta `vue-i18n` con claves en inglés como texto y el diseño del spec queda confirmado o ajustado antes de migrar texto.

## Contexto

`app/` no tiene `vue-i18n`. El diseño usa el texto en inglés como clave, `es.json` plano, `fallbackFormat: true` y carga perezosa de `es`. Esta tarea no modifica código de producto.

## Alcance

- Con un proyecto temporal en `/tmp` (no dentro del repo) instalar `vue-i18n` y comprobar: (1) claves con `.`, `,`, `:`, `?`, `!`, `'` y comillas dobles; (2) claves con `{`, `}`, `@`, `$`, `|` y cómo escaparlas; (3) `fallbackFormat` con interpolación nombrada en `en` sin catálogo; (4) plurales `a | b | c` con `{count}`; (5) `<i18n-t keypath>` con slots; (6) `te()` con claves con punto; (7) import dinámico de `es.json` como chunk aparte en `vite build`; (8) uso de `t` fuera de componentes tras `i18n.global`.
- Registrar resultados, decisión de escape y cualquier ajuste al spec en `docs/i18n.md` (borrador, sección «Verificaciones») y en las notas de esta tarea.
- Si algún punto falla, proponer la alternativa y actualizar `spec.md` antes de continuar.

## Criterios de aceptación

- [ ] Cada punto del alcance tiene resultado observado (comando y salida resumida) en las notas.
- [ ] Se decide cómo se escriben en una clave los caracteres especiales de la sintaxis de mensajes.
- [ ] Se confirma (o corrige en el spec) que `te()`/`t()` encuentran claves con punto en un catálogo plano.
- [ ] No quedan archivos temporales ni cambios en `app/` ni en `package.json`.

## Referencias

- https://vue-i18n.intlify.dev/guide/essentials/syntax.html
- https://vue-i18n.intlify.dev/guide/essentials/pluralization.html

## Fuera de alcance

- Cualquier cambio en `app/` (002 en adelante).

## Notas de implementación

