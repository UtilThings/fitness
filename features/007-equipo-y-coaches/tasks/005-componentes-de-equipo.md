# 005 - [Componente] RolePermissions, MemberForm y MemberAvatar

- **Prioridad:** 5
- **Estado:** Completado
- **Depende de:** 004
- **Fase:** Fase 2

## Objetivo

Existen los componentes de equipo reutilizables por las tres vistas: tabla de permisos por rol, formulario de integrante y avatar con carga.

## Contexto

`src/lib/permissions.ts` (feature 006) define la matriz `PERMISSIONS`. `useAuth.avatarUrl` solo cubre al usuario actual; las listas necesitan resolver el avatar de cualquier admin con `pb.files.getURL`. Los componentes compartidos (`PageHeader`, etc.) existen desde 006.

## Alcance

- Crear `app/src/components/team/RolePermissions.vue`: tabla roles × permisos construida desde `PERMISSIONS` con etiquetas en español (mapa `PERMISSION_LABELS` junto a la matriz) y resaltado del rol indicado por prop `highlight`.
- Crear `MemberForm.vue` (props `mode: "create" | "edit"`, `modelValue`, `errors`; campos `name`, `email`, `role`, `phone`, `bio`, y en alta contraseña con botón «Generar»; emite `submit`; muestra errores por campo recibidos de `parsePbError`).
- Crear `MemberAvatar.vue` (props `member`, `size`, `editable`; foto con `pb.files.getURL(..., { thumb })` o iniciales; al elegir imagen valida tipo imagen y máx. 2 MB antes de emitir `upload`).
- Pruebas de render, validaciones (correo, nombre obligatorio, contraseña mínima, archivo grande) y resaltado.

## Criterios de aceptación

- [x] `RolePermissions` refleja exactamente `PERMISSIONS` (una prueba lo compara).
- [x] `MemberForm` muestra errores por campo y bloquea el envío con datos inválidos.
- [x] `MemberAvatar` rechaza archivos que no sean imagen o superen 2 MB.
- [x] `bun run typecheck`, `lint`, `format:check`, `test` pasan.

## Referencias

- `features/007-equipo-y-coaches/spec.md`, sección "Fase 2" → tarea 005.
- https://primevue.org/inputtext/
- https://primevue.org/select/

## Fuera de alcance

- Vistas que usan los componentes (tareas 006 y 007).

## Notas de implementación

El correo se muestra en edición como campo de solo lectura. PocketBase valida los cambios de correo como una operación de autenticación independiente.
