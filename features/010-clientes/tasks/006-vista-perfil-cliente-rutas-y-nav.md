# 006 - [Vista] Perfil del cliente con pestañas, rutas y navegación

- **Prioridad:** 6
- **Estado:** Completado
- **Depende de:** 004, 005
- **Fase:** Fase 2: Interfaz de clientes

## Objetivo

Cada cliente tiene un perfil con pestañas (datos, objetivos y notas, evaluación inicial, historial), cambio de estado, marca de clase gratis e inactivación, accesible desde la navegación real.

## Contexto

Las rutas protegidas son hijas de `AdminLayout` (`meta.requiresAuth`, `meta.title`) en `app/src/router/index.ts`; la navegación vive solo en `app/src/layouts/admin-nav.ts`, donde `Clientes` apunta a `/clients` con un badge falso que ya retiró la feature 006. El historial se llenará con 011 (reservas), 013 (membresías y créditos) y 014 (pagos).

## Alcance

- Crear `app/src/views/admin/ClientDetailView.vue` con `Tabs` de PrimeVue:
  - **Datos**: `ClientForm` en modo edición, estado con selector y confirmación al pasar a `inactive`, contacto de emergencia, `joined_on`.
  - **Objetivos y notas**: `goals` y `notes` (notas operativas internas) con guardado explícito.
  - **Evaluación inicial**: `app/src/components/clients/AssessmentForm.vue` con bloques estructurados (médico, estilo de vida, entrenamiento, medidas, objetivos y notas); guarda en `assessment` con `version: 1`, `completed_on` y `assessed_by`.
  - **Historial**: `ClientHistoryTab.vue` que renderiza las secciones de `app/src/views/admin/clients/history-sections.ts` (arreglo `{ key, label, component, available }`); hoy `Reservas`, `Membresías` y `Pagos` aparecen como «Disponible con la feature NNN» y 011/013/014 los activan.
- Marca «Primera clase gratis: usada/disponible»; solo el owner puede editarla (interruptor deshabilitado para otros roles).
- Botón «Inactivar»; «Eliminar» solo para owner: ante `409` muestra «Tiene historial» y ofrece inactivar.
- Rutas `clients` (`/clients`, `meta.title` «Clientes») y `client-detail` (`/clients/:id`, título «Cliente») en `router/index.ts`; entrada `Clientes` en `admin-nav.ts` sin marcadores falsos y con test de nav actualizado.

## Criterios de aceptación

- [x] `/clients` y `/clients/:id` requieren sesión y aparecen con el título correcto; `Clientes` está activa en la barra lateral.
- [x] Cambiar el estado activo → pausado → inactivo → activo se refleja en la lista.
- [x] El formulario de evaluación guarda y recarga los valores; un valor fuera de rango muestra el error del servidor.
- [x] Un coach ve la marca de clase gratis pero no puede cambiarla; el owner sí.
- [x] Eliminar un cliente con historial no lo borra y propone inactivar.
- [x] La pestaña Historial muestra los placeholders de 011, 013 y 014 sin errores.
- [x] `typecheck`, `lint`, `format:check`, `test` y `build` pasan.

## Referencias

- `features/010-clientes/spec.md`, sección "Fase 2" → tarea 006.
- `app/src/router/index.ts`, `app/src/layouts/admin-nav.ts`.
- https://primevue.org/tabs/

## Fuera de alcance

- Contenido real de las secciones de historial (011, 013, 014).
- Importación CSV (decisión pendiente documentada en el spec).

## Notas de implementación


Verificado en Chromium con PocketBase local: rutas protegidas y barra lateral, transiciones, confirmación y cancelación de inactivación, evaluación guardada y recargada, permisos de clase gratis y respuesta 409 con opción de inactivar. El recorrido detectó y validó el ajuste de la fecha de alta vacía. Todas las comprobaciones y la compilación de la app pasaron.
