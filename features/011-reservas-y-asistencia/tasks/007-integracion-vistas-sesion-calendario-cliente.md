# 007 - [Vista] Reservas en la sesión, el calendario y el perfil del cliente

- **Prioridad:** 7
- **Estado:** Pendiente
- **Depende de:** 006, Feature 009 (contrato), Feature 010 (contrato)
- **Fase:** Fase 3: Interfaz

## Objetivo

Se puede reservar a un cliente desde la sesión o desde el cliente, la sesión muestra inscritos y espera, y el calendario y el perfil reflejan datos reales de reservas.

## Contexto

Las vistas de clases (009: calendario y detalle de sesión) y de clientes (010: `ClientDetailView` con `history-sections.ts`) existen por contrato; léelas en disco antes de integrar y respeta su estructura. El calendario de 009 muestra un cupo estimado hasta que esta tarea lo reemplaza.

## Alcance

- Detalle de sesión de 009: montar `SessionRoster` y el botón «Reservar» (abre `BookingDialog`); refrescar al reservar, cancelar o marcar asistencia.
- Calendario de 009: sustituir el cupo estimado por `AvailabilityTag` alimentado con `useSessionAvailability` (rango visible).
- Perfil de 010: registrar en `history-sections.ts` la sección «Reservas» (`available: true`) con una lista de reservas del cliente (fecha, servicio, estado, tardía/excepción), botón «Reservar clase» (selector de sesión próxima y `BookingDialog` con el cliente fijo) y cancelación desde la lista.
- Rutas y navegación: sin cambios si 009 y 010 ya las crearon; si el detalle de sesión no tuviera ruta propia, se monta en el panel lateral definido por 009.

## Criterios de aceptación

- [ ] Desde una sesión se reserva a un cliente; al llenarse queda en espera y se ve en el listado de espera.
- [ ] Desde el perfil del cliente se reserva una clase próxima y aparece en el historial de reservas.
- [ ] Cancelar muestra el aviso de ventana y aplica la excepción con nota; el cupo se libera y se promueve a la espera (visible tras refrescar).
- [ ] Marcar «asistió» o «no se presentó» actualiza el estado en la sesión y en el historial del cliente.
- [ ] El calendario muestra Disponible/Casi llena/Llena según los datos reales.
- [ ] `typecheck`, `lint`, `format:check`, `test` y `build` pasan.

## Referencias

- `features/011-reservas-y-asistencia/spec.md`, sección "Fase 3" → tarea 007.
- `features/009-horarios-y-clases/spec.md` y `features/010-clientes/spec.md` (contratos de las vistas).

## Fuera de alcance

- Créditos, planes y pagos en las vistas (013, 014).

## Notas de implementación

