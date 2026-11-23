# 005 - [Lib] Exportación a CSV segura

- **Prioridad:** 5
- **Estado:** Completado
- **Depende de:** Feature 006 (contrato)
- **Fase:** Fase 3: Exportación y cliente

## Objetivo

Existe una utilidad de cliente que convierte tablas de reportes a CSV compatible con Excel y segura frente a inyección de fórmulas, y la descarga como archivo.

## Contexto

`app/src/lib/` contiene `env.ts`, `pocketbase.ts` y `theme.ts` (más `datetime.ts` de 006). Los nombres de servicio, plan y coach los escribe el staff, por lo que pueden contener comas, comillas, saltos de línea o fórmulas (`=`, `+`, `-`, `@`). Excel necesita BOM UTF-8 para mostrar acentos y `ñ`.

## Alcance

- Crear `app/src/lib/csv.ts` con `toCsv(columns, rows)` (`columns: { key, label, type?: 'text' | 'number' | 'money' }[]`) y `downloadCsv(filename, csv)` (`Blob` con tipo `text/csv;charset=utf-8`, enlace temporal y `URL.revokeObjectURL`) y `csvFilename(kind, from, to)` (saneado: solo `[a-z0-9_-]`).
- Reglas: separador `,`, fin de línea `\r\n`, prefijo BOM `\uFEFF`, entrecomillado si hay `,`, `"`, `\r` o `\n` con comillas duplicadas; textos que empiezan por `=`, `+`, `-`, `@`, tab o `\r` se prefijan con `'`; valores numéricos reales (type number/money) se escriben sin prefijo; `null`/`undefined` → celda vacía; dinero en centavos se exporta como decimal con punto (`268.00`).
- Pruebas `app/src/lib/csv.test.ts`: comas, comillas, saltos de línea, Unicode, las cuatro fórmulas peligrosas y un texto legítimo como `-5 días` (se prefija, por ser texto), números negativos reales sin prefijo, nulos, BOM al inicio, nombre de archivo saneado, `downloadCsv` con `URL.createObjectURL` simulado.
- Sin dependencias nuevas.

## Criterios de aceptación

- [x] La salida empieza con `\uFEFF` y usa `\r\n` entre filas.
- [x] `=HYPERLINK("http://x","a")` se exporta como `"'=HYPERLINK(""http://x"",""a"")"` (prefijo, entrecomillado y comillas duplicadas).
- [x] Un campo con coma y salto de línea queda en una sola celda al volver a analizarlo con un parser CSV de referencia en la prueba.
- [x] `csvFilename('revenue', '2026-11-01', '2026-11-30')` no contiene caracteres fuera de `[a-z0-9_.-]`.
- [x] `bun run test`, `lint`, `format:check` y `typecheck` en `app/` pasan.

## Referencias

- `features/017-reportes/spec.md`, sección "Fase 3" → tarea 005.
- https://owasp.org/www-community/attacks/CSV_Injection
- https://datatracker.ietf.org/doc/html/rfc4180

## Fuera de alcance

- Exportación a XLSX o PDF.
- Conectar el botón en la vista (008).

## Notas de implementación

Se reutilizó centsToDecimal para importes. La prueba relee el CSV con el parser csv de la biblioteca estándar de Python 3 y verifica el BOM y la neutralización. La suite de la app pasó con 288 pruebas, además de lint, formato y tipos.
