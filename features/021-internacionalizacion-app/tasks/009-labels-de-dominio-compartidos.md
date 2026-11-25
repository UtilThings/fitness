# 009 - [Módulo] Labels de dominio y validaciones compartidas

- **Prioridad:** 9
- **Estado:** Pendiente
- **Depende de:** 008
- **Fase:** Fase 3: Migración del texto de la interfaz

## Objetivo

Los mapas de etiquetas de dominio y las validaciones de `lib/` devuelven texto en el idioma activo y son reutilizables por todas las vistas.

## Contexto

Archivos con texto en español: `lib/catalog.ts` (`kindLabel`, `policyLabel`, `validateServiceForm`), `lib/agenda.ts`, `lib/bookings.ts`, `lib/memberships.ts`, `lib/coaching.ts`, `lib/audit.ts`, `lib/messages.ts`, `lib/schedule-week.ts`, `lib/integration-origins.ts`, `lib/clients.ts`, `components/team/team-labels.ts`, `components/team/team-validation.ts`, `types/pb.ts`.

## Alcance

- Convertir las constantes de labels en funciones o mapas `valor → clave` (con `tl()`) que se traducen al renderizar; no construir claves por concatenación.
- Validaciones: mensajes en inglés con `t()` y variables nombradas (`{max}`, `{min}`).
- Mantener `lib/messages.ts` con las etiquetas de idioma de clientes (`Español`/`English`) sin traducir: son nombres de idioma.
- Actualizar los consumidores mínimos para que compilen (sin migrar su otro texto) y las pruebas de `lib/` y de componentes de labels.

## Criterios de aceptación

- [ ] `cd app && bun run lint`, `bun run typecheck` y `bun run test` pasan en verde.
- [ ] `bun run i18n:check` pasa en verde (sin claves faltantes ni huérfanas).
- [ ] Ningún mapa de labels evalúa `t()` al importar el módulo.
- [ ] Las validaciones devuelven el texto del idioma activo.

## Referencias

- `features/021-internacionalizacion-app/spec.md`, «Contrato de claves y uso».

## Fuera de alcance

- Texto propio de cada vista (010-018).

## Notas de implementación

