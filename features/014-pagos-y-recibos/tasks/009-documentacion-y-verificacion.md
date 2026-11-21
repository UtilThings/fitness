# 009 - [Verificación] Documentación, punto de extensión de pasarela y cierre

- **Prioridad:** 9
- **Estado:** Pendiente
- **Depende de:** 005, 008
- **Fase:** Fase final: Verificación y cierre

## Objetivo

La feature queda documentada (incluido el punto de extensión de la pasarela), verificada y marcada como completada.

## Contexto

`api/README.md` y `app/README.md` documentan cada módulo; `scripts/verify-api.sh` y `scripts/verify-app.sh` agrupan las comprobaciones, y las tareas 004 y 005 ya añadieron casos de API.

## Alcance

- `api/README.md`: sección "Pagos y recibos" (colecciones, rutas, secuencia de recibo, anulación, cobros por ciclo, `due`) y subsección "Punto de extensión: pasarela de pago" (uso de `settlePayment`, campos `provider`/`external_ref`, webhook con verificación de firma; explícitamente no implementado).
- `app/README.md`: vistas, recibo imprimible y composables.
- Revisar que `scripts/verify-api.sh` cubra numeración consecutiva, anulación, cobro por ciclo y `due`.
- Ejecutar `scripts/verify-api.sh` y `scripts/verify-app.sh`; marcar criterios y poner `Estado: Completado` en el spec.

## Criterios de aceptación

- [ ] Los READMEs describen la feature y el punto de extensión.
- [ ] `scripts/verify-api.sh` y `scripts/verify-app.sh` terminan en verde.
- [ ] Todos los criterios del spec están marcados o los hallazgos quedan anotados.

## Referencias

- `features/014-pagos-y-recibos/spec.md`, "Criterios de Aceptación" y "Validación Post-Deploy".

## Fuera de alcance

- Cualquier funcionalidad nueva, incluida la pasarela.

## Notas de implementación

<!-- Vacío al crear la tarea. -->
