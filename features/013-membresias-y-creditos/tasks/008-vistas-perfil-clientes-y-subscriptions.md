# 008 - [Vista] Pestaña Membresías, filtro en clientes y vista `/memberships`

- **Prioridad:** 8
- **Estado:** Completado
- **Depende de:** 005, 007
- **Fase:** Fase 4: Interfaz

## Objetivo

El staff ve y gestiona membresías desde el perfil del cliente y desde una lista global, filtra clientes por plan activo y puede forzar una reserva sin créditos con nota.

## Contexto

Las vistas de 010 (perfil con pestañas, lista de clientes) y el diálogo de reserva de 011 existen por contrato; verificar sus nombres reales en `app/src/views/admin/` y `app/src/components/` antes de editar. `app/src/layouts/admin-nav.ts` centraliza la navegación; las entradas falsas ya fueron retiradas en 006.

## Alcance

- Pestaña "Membresías" en el perfil del cliente: tarjeta de saldo, membresías activas y pasadas con `MembershipActions`, botón "Asignar plan" y `CreditLedger` de la membresía seleccionada.
- Lista de clientes (010): filtro "Plan activo" (select de planes) y "Con membresía activa/sin membresía". Verificar que `filter` con `memberships_via_client.plan ?= ... && memberships_via_client.status ?= 'active'` empareja el mismo registro; si no, resolver los ids de cliente desde `memberships` y filtrar por `id`.
- Crear `app/src/views/admin/MembershipsView.vue`: tabla paginada de membresías (cliente, plan, estado, periodo, saldo, compromiso), filtros por estado, plan y "renovación pendiente", acciones por fila.
- Ruta `/memberships` (`meta.title: "Suscripciones"`, `requiresAuth`) en `router/index.ts` y entrada real en `admin-nav.ts`, retirando el marcador equivalente si existe.
- Integrar `CreditOverrideDialog` en el diálogo de reserva de 011: al recibir `no_credits`/`weekly_limit` ofrecer la excepción y reenviar con `override_note`.
- Pruebas Vitest: ruta registrada y nav (rutas únicas), filtros de `MembershipsView` y flujo de override.

## Criterios de aceptación

- [x] Desde el perfil se asigna un plan y aparecen saldo e historial.
- [x] La lista de clientes filtra por plan activo con resultados correctos.
- [x] `/memberships` lista, filtra y permite renovar/pausar/cancelar; sin sesión redirige a login.
- [x] Reservar sin créditos muestra el diálogo de excepción y no permite confirmar sin nota.
- [x] `bun run test`, `lint`, `format:check`, `typecheck` y `build` pasan.

## Referencias

- `features/013-membresias-y-creditos/spec.md`, "Fase 4" → tarea 008.
- `app/src/layouts/admin-nav.ts`, `app/src/router/index.ts`.

## Fuera de alcance

- Pagos en el perfil (014); coaching (016).

## Notas de implementación

La verificación REST confirmó que el filtro inverso exige plan y estado en la misma membresía. El filtro sin membresía activa incluye clientes sin registros y clientes con historial vencido.
