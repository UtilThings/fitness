# 004 - [Migración] Seed idempotente del catálogo

- **Prioridad:** 4
- **Estado:** Pendiente
- **Depende de:** 001, 002, 003
- **Fase:** Fase 1: Esquema y datos

## Objetivo

Una base nueva arranca con los 5 servicios y 10 planes reales de JQ Fitness, sin duplicados al repetir el arranque ni pisar ediciones del owner.

## Contexto

Las migraciones de PocketBase JS se ejecutan una vez, pero el seed debe ser idempotente por si se restaura una base parcial o se reaplica. Los datos están en `CATALOG_SEED` (tarea 003). Los coaches no existen como datos conocidos, por lo que `default_coach` queda vacío. Comprobar antes si `require(`${__hooks}/lib/catalog`)` funciona dentro de una migración en la versión de PocketBase fijada; si no, incrustar los datos en la migración (y mantener la prueba de paridad apuntando al seed de la lib como referencia).

## Alcance

- Crear `api/pb_migrations/<timestamp>_seeded_catalog.js` (timestamp mayor que 002).
- `up`: para cada servicio de `CATALOG_SEED` buscar por `slug` (`app.findFirstRecordByData`) y crear solo si falta; para cada plan buscar por (`service`, `name`) y crear solo si falta; nunca actualizar registros existentes.
- `down`: eliminar los planes y servicios sembrados (por `slug` / (`service`, `name`)) únicamente si no tienen dependientes; ignorar los que sí.
- Los cupos son 6 (Group Strength), 12 (Tropical Jump), 1 (Personal 1 a 1), 2 (Personal Partner) y 0 (Online Coaching); las políticas 24 h personal, 12 h grupal, 0 online. Online Coaching no recibe planes.
- Los hooks de validación (005) no se ejecutan en migraciones: el seed debe respetar por construcción `is_first_class` única y precios coherentes.

## Criterios de aceptación

- [ ] Tras arrancar con base limpia hay 5 servicios y 10 planes con precios $800/$1080/$1280, $1127/$1447/$1597, $260, $200 (compromiso 4), $15 y $0 (`is_first_class`).
- [ ] Cambiar un precio en `/_/` y reaplicar el seed (`up`) no restaura el valor original ni duplica registros.
- [ ] Solo existe un plan con `is_first_class = true`.
- [ ] `down` elimina lo sembrado cuando no hay dependientes y no falla cuando los hay.

## Referencias

- `features/008-catalogo-de-servicios-y-planes/spec.md`, tabla de datos reales en "Estado actual".
- `api/src/lib/catalog.ts` (`CATALOG_SEED`).
- https://pocketbase.io/docs/js-migrations/

## Fuera de alcance

- Asignar `default_coach` (lo hace el owner en la UI) y planes de Online Coaching (feature 016).

## Notas de implementación

<!-- Vacío al crear la tarea. -->
