# 007 - [Vista] `/payments` y recibo imprimible

- **Prioridad:** 7
- **Estado:** Pendiente
- **Depende de:** 005, 006
- **Fase:** Fase 4: Interfaz

## Objetivo

El staff gestiona cobros desde `/payments` con filtros y puede abrir e imprimir el recibo de cualquier pago cobrado.

## Contexto

Rutas protegidas son hijas de `AdminLayout`; el recibo imprimible va como ruta protegida de primer nivel (sin barra lateral) para imprimir limpio. `admin-nav.ts` es la única fuente de navegación. Sin PDF: se usa `window.print()` y CSS `@media print`.

## Alcance

- Crear `app/src/views/admin/PaymentsView.vue`: tabla paginada (cliente, concepto/plan, monto, método, estado, vencimiento, recibo), filtros por estado, método, cliente, rango de fechas y "solo vencidos", tarjetas de totales con `usePaymentsDue`, acciones por fila (registrar pago, marcar pagado, anular, ver recibo) con los diálogos de 006.
- Crear `app/src/views/admin/ReceiptView.vue` (ruta `/receipts/:id`, `meta.requiresAuth`, `meta.title`): cabecera del negocio, número, fecha, cliente, concepto, monto, método y marca "ANULADO" si es `void`; botón "Imprimir" oculto en impresión; estilos `@media print` (tamaño carta, sin fondo ni sombras) en `app/src/styles/print.css`.
- Rutas en `router/index.ts` y entrada real "Pagos" en `admin-nav.ts` (retirando marcadores sustituidos).
- Pruebas Vitest: filtros de la vista, `ReceiptView` (número, monto, marca de anulado), ruta y nav.

## Criterios de aceptación

- [ ] Los filtros combinados devuelven los pagos esperados y "solo vencidos" muestra únicamente `pending` con `due_on` pasado.
- [ ] Marcar pagado desde la fila muestra el número de recibo asignado.
- [ ] El recibo no pagado (`pending`) no se puede abrir; el anulado muestra "ANULADO".
- [ ] En la vista de impresión no aparecen menús ni botones.
- [ ] Sin sesión, `/payments` y `/receipts/:id` redirigen a login.
- [ ] `bun run test`, `lint`, `format:check`, `typecheck` y `build` pasan.

## Referencias

- `features/014-pagos-y-recibos/spec.md`, "Fase 4" → tarea 007.
- https://developer.mozilla.org/docs/Web/CSS/@media/print

## Fuera de alcance

- Generación de PDF; pestaña de perfil y dashboard (008).

## Notas de implementación

<!-- Vacío al crear la tarea. -->
