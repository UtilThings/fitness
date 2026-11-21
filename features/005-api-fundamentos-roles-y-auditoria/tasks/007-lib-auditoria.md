# 007 - [Lib] Lógica pura de auditoría y configuración

- **Prioridad:** 7
- **Estado:** Completado
- **Depende de:** 003
- **Fase:** Fase 2

## Objetivo

Existe la lógica pura que decide qué colecciones se auditan y construye entradas de `audit_logs` sin datos sensibles.

## Contexto

Contrato: cada feature de módulo añade su colección a `api/src/lib/audit-config.ts`. El hook (tarea 008) solo orquesta; la lógica vive aquí para poder probarla con `bun test`. `audit_logs` guarda `action`, `collection`, `record_id`, `summary`, `diff`.

## Alcance

- Crear `api/src/lib/audit-config.ts`: `AUDITED_COLLECTIONS = ["admins"]`, `SENSITIVE_FIELDS = ["password", "passwordHash", "tokenKey"]`, `IGNORED_FIELDS = ["created", "updated"]`, `isAudited(name)` (falso siempre para `audit_logs`).
- Crear `api/src/lib/audit.ts`: `computeDiff(before, after)`, `redact(obj)`, `buildSummary(action, collection, record)` (usa `name`, `title`, `email` o el id), `buildEntry({ action, collection, recordId, actorId, before, after })` → objeto `{ actor, action, collection, record_id, summary, diff }`. create: diff con solo `to`; delete: solo `from`; update sin cambios devuelve `null`.
- Crear `api/src/lib/audit.test.ts`: update sin cambios, cambio simple, redacción de contraseñas, create/delete, `audit_logs` no auditable, resumen con y sin nombre.

## Criterios de aceptación

- [x] `bun test` pasa.
- [x] `buildEntry` nunca incluye `password`, `passwordHash` ni `tokenKey` en `diff` ni `summary`.
- [x] Las funciones no usan globals de PocketBase.

## Referencias

- `features/005-api-fundamentos-roles-y-auditoria/spec.md`, sección "Fase 2" → tarea 007.
- `api/src/lib/rules.ts` (convención de lib pura).

## Fuera de alcance

- Hook que persiste las entradas (tarea 008).
- Eventos `custom` desde rutas propias (las features que los necesiten usarán `buildEntry` con `action: "custom"`).

## Notas de implementación


Pasaron las 18 pruebas acumuladas. La redacción cubre campos sensibles anidados y variantes de nombres de contraseña. La comparación omite timestamps automáticos y cambios exclusivos en el orden de las claves.
