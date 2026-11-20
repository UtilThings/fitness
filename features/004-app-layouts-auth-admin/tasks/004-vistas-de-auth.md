# 004 - [Web] Vistas de login y recuperación de contraseña

- **Prioridad:** 4
- **Estado:** Completado
- **Depende de:** 002, 003
- **Fase:** Fase 2

## Objetivo

El usuario puede iniciar sesión y solicitar un enlace de recuperación desde pantallas con el estilo del layout de auth.

## Contexto

`LoginView` ya funciona (feature 003) pero lleva su propia estructura de página. PocketBase expone `pb.collection('users').requestPasswordReset(email)` (204 exista o no el correo). `useAuth` vive en `src/composables/useAuth.ts`.

## Alcance

- `useAuth.requestPasswordReset(email)`; propagar errores.
- `LoginView`: quitar la estructura de página, usar `AuthHeading` («Iniciar sesión», «Ingresa tus credenciales.»), etiquetas arriba de cada campo, enlace «¿Olvidaste tu contraseña?» a `forgot-password`.
- `views/auth/ForgotPasswordView.vue`: `AuthHeading` («¿Olvidaste tu contraseña?», «Ingresa tu correo.»), `InputText` (placeholder `nombre@empresa.com`), `Button` «Enviar enlace» con `:loading`, pie «¿Recordaste tu contraseña? Iniciar sesión». Éxito → mensaje neutro (`Message` de PrimeVue) y formulario deshabilitado; error → aviso genérico.
- Pruebas de `requestPasswordReset` en `useAuth.test.ts`.

## Criterios de aceptación

- [x] Solicitar el enlace muestra siempre el mismo mensaje de éxito.
- [x] Un fallo de red muestra un aviso genérico y permite reintentar.
- [x] El enlace de login lleva a `/forgot-password` y viceversa.
- [x] `bun run typecheck`, `lint`, `test` y `build` pasan.

## Referencias

- `features/004-app-layouts-auth-admin/spec.md`, sección "Fase 2" → tarea 004.
- https://pocketbase.io/docs/authentication/#password-reset

## Fuera de alcance

- Página de restablecimiento con token y registro.

## Notas de implementación

`requestPasswordReset` en `useAuth`. `ForgotPasswordView` deshabilita el formulario tras el éxito y muestra un `Message` neutro.
