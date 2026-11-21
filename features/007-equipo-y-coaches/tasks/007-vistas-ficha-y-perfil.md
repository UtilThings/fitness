# 007 - [Vista] Ficha del miembro y perfil propio

- **Prioridad:** 7
- **Estado:** Pendiente
- **Depende de:** 004, 005
- **Fase:** Fase 3

## Objetivo

Existe la ficha de cada integrante con sus permisos y el perfil propio donde cada usuario edita sus datos y cambia su contraseña.

## Contexto

`TeamMemberView` es también la ficha del coach: el horario y las clases (feature 009) se enlazarán después. `ProfileView` es la entrada de «Ajustes». PocketBase exige `oldPassword`, `password` y `passwordConfirm` para cambiar la contraseña y revoca el token vigente al hacerlo, por lo que hay que reautenticar.

## Alcance

- Crear `app/src/views/admin/TeamMemberView.vue`: carga el admin por `id` de la ruta (404 → mensaje), muestra `MemberAvatar`, nombre, correo, teléfono, rol, estado, bio, `RolePermissions` con `highlight` del rol y un bloque «Horario y clases» con «Disponible próximamente» (marcador que 009 reemplaza). Si `can("team.manage")` se muestra «Editar» con `MemberForm` y cambio de rol/estado.
- Crear `app/src/views/admin/ProfileView.vue`: tarjeta de datos (nombre, teléfono, bio, avatar) que actualiza el propio registro sin enviar `role` ni `active`, y tarjeta de contraseña (actual, nueva, confirmación con `validatePassword`); tras el cambio, reautenticar con `authWithPassword(email, nueva)` y avisar con `useNotify`; contraseña actual incorrecta se muestra en el campo.
- Pruebas de ambas vistas (carga, 404, edición permitida solo a owner, el perfil nunca envía `role`/`active`, reautenticación tras cambio de contraseña).

## Criterios de aceptación

- [ ] La ficha muestra datos y permisos del rol y el bloque reservado para 009.
- [ ] Solo el owner ve «Editar» en la ficha ajena; el perfil propio se edita sin enviar `role` ni `active`.
- [ ] Cambiar la contraseña con la actual correcta mantiene la sesión; con la actual incorrecta muestra el error en el campo.
- [ ] `bun run typecheck`, `lint`, `test`, `build` pasan.

## Referencias

- `features/007-equipo-y-coaches/spec.md`, sección "Fase 3" → tarea 007.
- https://pocketbase.io/docs/api-records/#update-record

## Fuera de alcance

- Horario real del coach (feature 009).
- Rutas y menú (tarea 008).

## Notas de implementación

