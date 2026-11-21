# 007 - [Componente] Composable `useMemberships` y componentes de membresía

- **Prioridad:** 7
- **Estado:** Pendiente
- **Depende de:** 004, 005
- **Fase:** Fase 4: Interfaz

## Objetivo

La app tiene un composable y componentes reutilizables para asignar planes, ver saldo e historial y ejecutar acciones sobre una membresía.

## Contexto

`app/src/lib/pocketbase.ts` exporta `pb`; las rutas custom se llaman con `pb.send`. Layout y navegación de la feature 006; fechas en hora local con `app/src/lib/datetime.ts`. Los planes salen de 008 (`plans` con su servicio) y los clientes de 010. PrimeVue 5, textos en español.

## Alcance

- Crear `app/src/composables/useMemberships.ts`: `list(filters)`, `listForClient(clientId)`, `ledger(membershipId)`, `assign`, `renew`, `pause`, `resume`, `cancel`, `adjust`, `eligibility`; tipos `Membership` y `CreditMovement`; errores con mensaje en español.
- Crear en `app/src/components/memberships/`: `MembershipStatusTag.vue` (incluye "Renovación pendiente" derivada), `AssignPlanDialog.vue` (plan activo, fecha de inicio, aviso de primera clase y de compromiso de 16 semanas), `MembershipActions.vue` (menú con renovar, pausar, reanudar, cancelar con nota obligatoria), `CreditAdjustDialog.vue` (delta + nota), `CreditLedger.vue` (tabla de movimientos con motivo, nota, reserva y fecha local) y `CreditOverrideDialog.vue` (confirma la excepción con `override_note`).
- Pruebas Vitest: `useMemberships` (mock de `pb.send`), `MembershipStatusTag` (estados) y validaciones de los diálogos (nota obligatoria).
- No añade rutas ni entradas de navegación.

## Criterios de aceptación

- [ ] Los diálogos no envían sin nota cuando es obligatoria.
- [ ] `CreditLedger` muestra los movimientos ordenados del más reciente y el saldo actual con color distinto cuando es negativo.
- [ ] Los errores del API se muestran como aviso en español.
- [ ] `bun run test`, `lint`, `format:check`, `typecheck` y `build` pasan.

## Referencias

- `features/013-membresias-y-creditos/spec.md`, "Fase 4" → tarea 007.
- https://primevue.org/dialog/

## Fuera de alcance

- Vistas, rutas y navegación (008).

## Notas de implementación

<!-- Vacío al crear la tarea. -->
