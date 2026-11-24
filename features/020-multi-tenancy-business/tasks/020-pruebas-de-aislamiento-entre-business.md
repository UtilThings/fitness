# 020 - [Pruebas] Pruebas de aislamiento entre business

- **Prioridad:** 20
- **Estado:** Pendiente
- **Depende de:** 012, 013, 015, 019
- **Fase:** Fase final: Verificación y cierre

## Objetivo

Un verificador automatizado demuestra que ningún dato cruza entre dos business en ninguna colección, ruta, cron ni en la API pública.

## Contexto

Los scripts `scripts/verify-*.ts` y `verify-api.sh` arrancan PocketBase con datos temporales y comprueban permisos, auditoría y catálogo. `TENANT_COLLECTIONS` y `TENANT_REFERENCES` (003-007) enumeran lo que debe cumplirse.

## Alcance

- `scripts/verify-tenancy.ts`: siembra dos business con datos en todas las colecciones; para cada colección de `TENANT_COLLECTIONS` comprueba lista, lectura, edición y borrado cruzados (`404`), creación con `business` ajeno (ignorado), cambio de `business` (`400`) y relaciones cruzadas (`400`).
- Rutas `/api/admin/*` (dashboard, reportes, agenda, mensajes, rotación de clave): solo datos del propio business.
- API pública: la clave de A nunca devuelve datos de B; clave rotada → `401`; CORS por business.
- Crons: ejecutar con ambos business y comprobar que cada resultado queda en su business y que un business inactivo se omite.
- Test estructural: falla si aparece una colección de dominio sin `business` o sin regla de tenant.
- Integrar en `scripts/verify-api.sh`.

## Criterios de aceptación

- [ ] El script termina en verde y falla si se elimina cualquier regla de tenant (comprobado quitando una a propósito).
- [ ] Cubre las 17 colecciones, `admins` y `businesses`.
- [ ] Cubre las rutas admin y las dos rutas públicas.
- [ ] `scripts/verify-api.sh` lo ejecuta y termina en verde.

## Fuera de alcance

- Pruebas de carga o de rendimiento.

## Referencias

- `features/020-multi-tenancy-business/spec.md`, sección "Fase final: Verificación y cierre" → tarea 020.
- `scripts/verify-api.sh`, `scripts/verify-public.ts`

## Notas de implementación

<!-- Vacío al crear la tarea. Al completarla, registra archivos creados/modificados, decisiones, desviaciones y hallazgos pendientes. -->
