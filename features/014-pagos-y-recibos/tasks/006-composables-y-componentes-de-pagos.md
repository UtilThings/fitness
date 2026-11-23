# 006 - [Componente] Composables y componentes de pagos

- **Prioridad:** 6
- **Estado:** Completado
- **Depende de:** 004
- **Fase:** Fase 4: Interfaz

## Objetivo

La app dispone de composables y componentes reutilizables para listar, registrar, pagar y anular pagos, y para formatear dinero.

## Contexto

`pb` (`app/src/lib/pocketbase.ts`) permite lecturas directas de `payments` (regla de lista) y `pb.send` para las rutas. Dinero en centavos; el formato `Intl.NumberFormat` solo se usa en la app. PrimeVue 5, textos en español.

## Alcance

- Crear `app/src/lib/money.ts` (`formatCents`, `parseToCents` robusto con coma/punto) y `app/src/lib/business.ts` (nombre, ciudad Miramar FL, contacto).
- Crear `app/src/composables/usePayments.ts` (`list(filters)`, `create`, `pay`, `void`, tipos `Payment`) y `usePaymentsDue.ts` (carga `GET /due`, estado de carga/error).
- Crear en `app/src/components/payments/`: `PaymentStatusTag.vue` (pending/paid/void y "Vencido"), `PaymentFormDialog.vue` (cliente, monto, método, fecha, nota; modo "registrar" y "marcar pagado") y `VoidPaymentDialog.vue` (motivo obligatorio).
- Pruebas Vitest: `money` (casos de redondeo y entradas inválidas), `usePayments` (mock), `PaymentStatusTag`, validación del diálogo de anulación.

## Criterios de aceptación

- [x] `parseToCents("12,50")` y `parseToCents("12.5")` devuelven 1250.
- [x] El diálogo de anulación no envía sin motivo.
- [x] Los errores del API se muestran como aviso en español.
- [x] `bun run test`, `lint`, `format:check`, `typecheck` y `build` pasan.

## Referencias

- `features/014-pagos-y-recibos/spec.md`, "Fase 4" → tarea 006.

## Fuera de alcance

- Vistas y rutas (007, 008).

## Notas de implementación

Se reutilizó el formateador de USD existente. Los montos del diálogo aceptan coma o punto decimal y redondean al centavo. El contacto público del recibo se configura con VITE_BUSINESS_CONTACT.
