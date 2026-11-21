# Especificación: Catálogo público en `web/` desde la API

- **Estado:** Pendiente

## Resumen Ejecutivo

Este conjunto de 8 tareas hace que el sitio público (`web/`, Astro + Vue + Docker + Nginx) lea precios, planes, horarios y disponibilidad reales desde la API de PocketBase, en lugar de `web/src/lib/data.ts` y de la disponibilidad simulada de `web/src/lib/schedule.ts`. La API expone dos rutas públicas de solo lectura sin datos personales, con caché corta y CORS acotado al dominio del sitio. El sitio mantiene su contenido estático como respaldo si la API falla. **No integra formularios**: `LeadForm` y las páginas de contacto siguen como están (el CRM está fuera de alcance).

Entrega:

1. **Rutas públicas** `GET /api/public/catalog` y `GET /api/public/schedule?week=` (`api/src/hooks/public.ts` + lógica pura `api/src/lib/public-catalog.ts` probada con `bun test`): solo conteo de cupos y estado `available|almost|full`, sesiones privadas excluidas, caché corta y CORS por configuración.
2. **Cliente `web/src/lib/api.ts`** con tiempo de espera, validación de forma, mapeo a los tipos actuales (`Plan`, `ClassTemplate`) y respaldo a los datos estáticos.
3. **Páginas y componentes adaptados**: precios y planes se renderizan en el build con datos de la API y se revalidan en el navegador (isla `PricingGrid.vue`); el horario (`ScheduleBoard.vue`) consulta la API por semana en el cliente.
4. **Pruebas y configuración**: pruebas de `web/` actualizadas, variables en `web/src/lib/env.ts`, `.env.example` y `Dockerfile`.

Contrato que deja a las siguientes features: el formato JSON público de `catalog` y `schedule`, estable y versionable, que cualquier otro cliente (p. ej. una futura reserva en línea) podrá reutilizar.

---

## Estado actual del repositorio (punto de partida)

| Elemento | Estado |
|----------|--------|
| `web/` | Astro 7 + `@astrojs/vue`, salida **estática** (`astro build` → `dist/`), servido por Nginx (`web/nginx.conf`, `web/Dockerfile` con ARG `PUBLIC_SITE_URL` obligatorio y `PUBLIC_API_URL` opcional) |
| `web/src/lib/data.ts` | `Plan`, `ClassTemplate`, `personalOneOnOne`, `personalPartner`, `groupPlans`, `jumpPlans`, `classTemplates` (9 plantillas semanales), `availability(spotsLeft)`, `formatPrice(price)`; precios en **dólares enteros** |
| `web/src/lib/schedule.ts` | `weekStart`, `weekDays`, `classesForDay`, `formatRange` y `spotsLeft` (cupos **simulados** con una función seno) |
| `web/src/lib/env.ts` | `parseEnv` con `PUBLIC_SITE_URL` (obligatoria) y `PUBLIC_API_URL` (opcional, hoy sin uso) |
| Componentes | `PricingCard.astro` (recibe `Plan`), `ScheduleBoard.vue` (`client:only="vue"`, calcula semana en el navegador) |
| Páginas que usan datos | `pricing.astro`, `personal-training.astro`, `group-strength-training.astro`, `tropical-jump.astro`, `schedule.astro` |
| Pruebas | `src/lib/{data,schedule,env,i18n}.test.ts`, `src/components/ScheduleBoard.test.ts`, `tests/dist/routes.test.ts` (requiere build) |
| `api/` | Sin rutas públicas; `services`, `plans` (008), `class_sessions` (009) y `bookings` (011) solo por contrato |
| CORS | PocketBase aplica por defecto su middleware CORS global (orígenes `*`); su comportamiento con rutas custom hay que verificarlo |

> Verificación obligatoria previa: la tarea 002 debe comprobar, con la versión instalada de PocketBase, cómo acotar el CORS de una ruta custom (`$apis.cors({ allowOrigins })` frente al middleware global y la bandera `--origins`) y cómo establecer cabeceras `Cache-Control` desde `routerAdd`. La tarea 004 debe comprobar que `astro build` tolera una API caída.

---

## Contrato HTTP

### Rutas

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/public/catalog` | ninguna | Servicios activos y planes activos, más los horarios semanales recurrentes |
| `GET` | `/api/public/schedule` | ninguna | Clases de una semana con cupos y estado |

### Parámetros

| Parámetro | Obligatorio | Descripción |
|-----------|-------------|-------------|
| `week` | No | Fecha local `YYYY-MM-DD` de cualquier día de la semana; se normaliza al domingo (igual que `weekStart` de `web`). Por defecto, la semana actual en `America/New_York`. Semanas pasadas se ajustan a la actual; más allá de `PUBLIC_SCHEDULE_MAX_WEEKS` (8) → `400` |

### Respuesta de `catalog`

```json
{
  "version": 1,
  "currency": "USD",
  "services": [
    {
      "slug": "group-strength",
      "kind": "group",
      "name": "Group Strength",
      "plans": [
        {
          "name": "8-Class Pack",
          "price_cents": 26000,
          "billing_unit": "per_4_weeks",
          "sessions": 8,
          "per_week": 2,
          "commitment_periods": 0,
          "is_first_class": false,
          "partner": false,
          "note": ""
        }
      ],
      "weekly_times": [{ "weekday": 2, "time": "09:00", "coach_name": "Coach JQ", "capacity": 6 }]
    }
  ]
}
```

### Respuesta de `schedule`

```json
{
  "version": 1,
  "timezone": "America/New_York",
  "week_start": "2026-11-15",
  "week_end": "2026-11-21",
  "sessions": [
    {
      "local_date": "2026-11-17",
      "local_time": "09:00",
      "service": { "slug": "group-strength", "name": "Group Strength" },
      "coach_name": "Coach JQ",
      "capacity": 6,
      "spots_left": 2,
      "status": "almost"
    }
  ]
}
```

Reglas del contrato:

- `status`: `full` (0 libres), `almost` (1-2), `available` (>2), igual que `availability` en `web/src/lib/data.ts`. `spots_left = max(0, capacity - reservas booked/attended/no_show)`.
- Solo sesiones `scheduled` de `kind` `regular` o `special`; las `private` (personal training) y las canceladas **nunca** aparecen. Solo servicios y planes `active`.
- **Sin datos personales**: no hay ids de reservas, clientes ni sesiones; el nombre del coach es el nombre de exhibición ya público en el sitio.
- Cabeceras: `Cache-Control: public, max-age=60, stale-while-revalidate=300`; `Access-Control-Allow-Origin` solo con el origen del sitio si está en `PUBLIC_SITE_ORIGINS`; `Vary: Origin`.

### Errores

| Condición | Respuesta |
|-----------|-----------|
| `week` mal formado | `400` `{ "message": "..." }` |
| `week` fuera del rango permitido | `400` |
| Error interno | `500` genérico, sin detalles |
| Origen no permitido | Respuesta normal sin cabeceras CORS (el navegador la bloquea) |

---

## Arquitectura de Cambios

### Fase 1: API pública (Tareas 001-002)

**001 - Lógica pura del catálogo público**
- `api/src/lib/public-catalog.ts`: `buildCatalog(services, plans, templates)` (whitelist de campos, orden por `sort`, solo activos), `buildSchedule(weekStart, sessions, bookingCounts, services, coaches)`, `normalizeWeek(input, today, maxWeeks)` (domingo local, límites), `availabilityStatus(spotsLeft)`.
- Pruebas `public-catalog.test.ts`: sesión privada y cancelada excluidas, plan inactivo excluido, `spots_left` nunca negativo, umbrales 0/1/2/3, semana normalizada a domingo, límites de semanas, ningún campo fuera de la whitelist (prueba de «forma exacta»), cambio de horario en marzo y noviembre.

**002 - Rutas `GET /api/public/catalog` y `/api/public/schedule`**
- `api/src/hooks/public.ts` con ``require(`${__hooks}/lib/public-catalog`)`` dentro de cada callback; consultas con acceso interno de `$app` (las reglas de las colecciones siguen cerradas); conteos de reservas en una sola consulta agrupada por sesión.
- Caché de 30 s en `$app.store()` por clave (`catalog`, `schedule:<week>`) más cabecera `Cache-Control`; CORS acotado: origen permitido solo si está en `PUBLIC_SITE_ORIGINS` (lista separada por comas, leída con `$os.getenv`), sin `*`.
- Entradas en `scripts/verify-api.sh`: respuestas `200` sin token, forma de campos, `400` con `week` inválida, cabecera CORS con el origen permitido y ausente con otro, ausencia de campos personales.

### Fase 2: Cliente y configuración en `web/` (Tareas 003-004)

**003 - Variables de entorno y configuración**
- `web/src/lib/env.ts`: añade `PUBLIC_API_TIMEOUT_MS` (entero 500-15000, por defecto 4000) validado en `parseEnv`; `PUBLIC_API_URL` pasa a documentar su uso real. `.env.example`, `Dockerfile` (ARG/ENV de `PUBLIC_API_TIMEOUT_MS`), `deploy.json` (argumento `PUBLIC_API_URL`) y `env.test.ts` actualizados.
- Para la API: `PUBLIC_SITE_ORIGINS` documentada en `api/README.md` (tarea 008) y consumida en la 002.

**004 - Cliente `api.ts`, adaptadores y respaldo**
- `web/src/lib/api.ts`: `fetchCatalog()` y `fetchSchedule(week)` con `AbortController` y tiempo de espera, validación de la forma de la respuesta (sin dependencias nuevas: guardas de tipo), y `ApiError`.
- `web/src/lib/catalog.ts`: `toPlans(service)` mapea `price_cents/100` → `Plan.price`, `billing_unit` → `unit`, `sessions`/`per_week` → `sessions`/`freq`, `commitment_periods` y `is_first_class` → `note`; `getCatalog()` devuelve `{ source: 'api' | 'static', ... }` con respaldo a `data.ts` si `PUBLIC_API_URL` falta o la API falla, sin lanzar nunca; los slugs de servicio esperados se centralizan en una constante.
- Pruebas: el mapeo de un payload equivalente a los datos actuales produce exactamente `groupPlans`, `jumpPlans`, `personalOneOnOne`, `personalPartner`; tiempo de espera, respuesta inválida y `404` caen al respaldo.

### Fase 3: Componentes y páginas (Tareas 005-006)

**005 - Precios y planes**
- Nueva isla `web/src/components/PricingGrid.vue` (misma tarjeta visual que `PricingCard.astro`, con `client:load`): recibe los planes iniciales renderizados en el build y los **revalida** en el navegador con `fetchCatalog()` (mantiene el valor inicial si falla; indica «Actualizando…» sin saltos de maquetación). `pricing.astro`, `personal-training.astro`, `group-strength-training.astro` y `tropical-jump.astro` obtienen planes y horarios con `getCatalog()` en el frontmatter.
- `PricingCard.astro` se conserva si alguna página sigue usándola; si queda sin uso se elimina.

**006 - Horario y disponibilidad real**
- `ScheduleBoard.vue` consulta `fetchSchedule(week)` por semana (la semana se calcula en hora de Miramar, FL, no en la del navegador), con estados de carga, error y semana vacía; el estado (`available|almost|full`) y los cupos vienen de la API.
- Respaldo: si la API falla, se muestran las clases de `classTemplates` **sin cupos** (estado «Consulta disponibilidad») y un aviso; se elimina `spotsLeft` simulado de `schedule.ts` y sus pruebas. Se conservan `weekStart`, `weekDays` y `formatRange`.
- Textos nuevos en `i18n.ts` (es/en): cargando, error, sin clases, consulta disponibilidad.

### Fase 4: Pruebas y cierre (Tareas 007-008)

**007 - Pruebas de `web/` actualizadas**
- `data.test.ts` (los datos estáticos siguen como respaldo), `schedule.test.ts` (sin `spotsLeft`), `ScheduleBoard.test.ts` (con `fetch` simulado: éxito, estados, error y respaldo), `env.test.ts`, y `tests/dist/routes.test.ts` (build sin `PUBLIC_API_URL` → respaldo; páginas contienen precios; build con API caída no falla).
- Añade una prueba de contrato entre el JSON de ejemplo del spec y las guardas de `api.ts`.

**008 - Documentación y verificación**
- `web/README.md` (rutas de datos, variables, estrategia de revalidación y respaldo, cuándo reconstruir), `api/README.md` (rutas públicas, `PUBLIC_SITE_ORIGINS`, caché), `scripts/verify-api.sh` y `web`: `bun run lint`, `format:check`, `check`, `test`, `build`, `test:dist` en verde.

---

## Impacto por Módulo

| Ruta | Cambio |
|------|--------|
| `api/src/lib/` | `public-catalog.ts` y `public-catalog.test.ts` |
| `api/src/hooks/` | `public.ts` (rutas públicas, caché y CORS) |
| `scripts/verify-api.sh` | Comprobaciones de rutas públicas |
| `web/src/lib/` | `api.ts`, `catalog.ts`, `env.ts`, `schedule.ts` (sin cupos simulados), `i18n.ts`; `data.ts` queda como respaldo |
| `web/src/components/` | `PricingGrid.vue` (nuevo), `ScheduleBoard.vue` (adaptado), `PricingCard.astro` (según uso) |
| `web/src/pages/` | `pricing`, `personal-training`, `group-strength-training`, `tropical-jump`, `schedule` |
| `web/.env.example`, `web/Dockerfile`, `web/deploy.json` | Variables nuevas |
| `web/tests/`, `web/src/**/*.test.ts` | Pruebas actualizadas |
| `web/README.md`, `api/README.md` | Documentación |

---

## Flujos Críticos

### Flujo 1: Visita a /pricing con la API disponible
```
1. En el build, pricing.astro llama a getCatalog() → fetch a PUBLIC_API_URL/api/public/catalog
2. El HTML estático se genera con los planes reales (SEO y primera pintura sin JavaScript)
3. En el navegador, PricingGrid se hidrata y revalida contra la API
4. Resultado: si un precio cambió después del build, el visitante ve el precio vigente sin redeploy
```

### Flujo 2: La API está caída
```
1. getCatalog() agota el tiempo de espera o recibe un error durante el build → usa data.ts, sin fallar el build
2. En /schedule, ScheduleBoard no obtiene la semana → muestra las clases de classTemplates sin cupos y un aviso
3. Resultado: el sitio sigue operativo y no muestra cupos inventados
```

### Flujo 3: Consulta desde otro origen
```
1. Un sitio ajeno hace fetch a /api/public/schedule desde el navegador
2. La respuesta no lleva Access-Control-Allow-Origin porque el origen no está en PUBLIC_SITE_ORIGINS
3. Resultado: el navegador bloquea la lectura; los datos siguen siendo públicos pero no sin restricción de origen
```

### Flujo 4: Parámetro malicioso o fuera de rango
```
1. GET /api/public/schedule?week=2026-02-30 o ?week=2099-01-01
2. normalizeWeek rechaza la fecha inválida o fuera de PUBLIC_SCHEDULE_MAX_WEEKS
3. Resultado: 400 con mensaje genérico; no se consulta la base de datos
```

---

## Notas de Implementación

### Decisiones
- **Mantener `web/` estático (Astro + Nginx) en lugar de pasar a SSR**: un adaptador Node obligaría a cambiar `Dockerfile`, `nginx.conf` y el despliegue (`deploy.json`) y a operar un proceso más, para datos que cambian poco. Se descartó. A cambio, el contenido es tan fresco como el último build.
- **Estrategia híbrida «build + revalidación en cliente»**: los precios y planes se incrustan en el HTML en el build (SEO, primera pintura sin JS, sin parpadeo) y la isla `PricingGrid` los revalida en el navegador contra la API, de modo que un cambio de precios no depende de reconstruir el sitio. El horario es dinámico por naturaleza (cupos por semana) y ya era una isla `client:only="vue"`; consulta la API en cliente. Descartadas: solo build (precios obsoletos), solo cliente para precios (sin contenido para buscadores y con parpadeo).
- **Respaldo estático (`data.ts`)** para precios y plantillas semanales; **sin respaldo de cupos**: la disponibilidad simulada se elimina porque mostrar cupos falsos en un sitio real es engañoso; en su lugar se muestra «Consulta disponibilidad».
- **Precios en centavos en la API, dólares enteros en `web`**: el mapeo vive en `catalog.ts` y se prueba contra los datos actuales para que el sitio se vea igual.
- **Slugs de servicio fijados en una constante del cliente**: deben coincidir con los datos sembrados por la feature 008; la prueba de mapeo lo documenta.
- **Caché corta en servidor (30 s, `$app.store()`) y en navegador/CDN (`max-age=60`)**: protege a PocketBase de ráfagas de visitantes sin atrasar los cupos más de un minuto.
- **CORS por configuración (`PUBLIC_SITE_ORIGINS`) y sin `*`**: la API es de lectura pública, pero acotar el origen reduce el uso ajeno desde navegadores.
- **Semana normalizada al domingo local**: coincide con `weekStart` de `web` y evita errores de zona horaria del navegador.

### Seguridad
- Rutas de solo lectura y respuesta construida por whitelist de campos (nunca se serializan registros completos).
- Sin identificadores de reservas, clientes ni sesiones; sesiones privadas y canceladas excluidas.
- Parámetros validados antes de cualquier consulta; errores internos sin detalle.
- Las reglas de las colecciones permanecen cerradas; las rutas leen con acceso interno.
- Límite de tasa: configurar el limitador integrado de PocketBase para el patrón `/api/public/*` (documentado en 008).
- El cliente trata la respuesta como no confiable: guardas de tipo, textos escapados por Vue y Astro.

### Referencias
- https://pocketbase.io/docs/js-routing/
- https://pocketbase.io/docs/js-routing/#middlewares
- https://docs.astro.build/en/guides/on-demand-rendering/
- https://docs.astro.build/en/guides/client-side-scripts/
- https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
- https://web.dev/articles/stale-while-revalidate

### Fuera de alcance
- Integración de formularios (`LeadForm`, contacto, coaching): CRM fuera de alcance.
- Reservas en línea desde el sitio y cuentas de clientes.
- SSR con adaptador y rutas dinámicas de Astro.
- Webhook para reconstruir el sitio al cambiar precios (posible mejora futura).
- Traducir al español los nombres de planes (la API devuelve los nombres como están en `plans`).

---

## Criterios de Aceptación

- [ ] `GET /api/public/catalog` y `GET /api/public/schedule?week=` responden `200` sin autenticación con el contrato del spec y sin datos personales.
- [ ] Las sesiones `private` y `cancelled`, y los servicios o planes inactivos, no aparecen; `status` sigue los umbrales `available`/`almost`/`full`.
- [ ] Solo los orígenes de `PUBLIC_SITE_ORIGINS` reciben `Access-Control-Allow-Origin`; la respuesta lleva `Cache-Control` corto.
- [ ] `week` inválido o fuera de rango devuelve `400`.
- [ ] `/pricing` y las páginas de servicios muestran los precios de la API y, con la API caída o sin `PUBLIC_API_URL`, los de `data.ts`; el build no falla.
- [ ] `/schedule` muestra horarios y cupos reales por semana, con estados de carga y error, y sin cupos simulados.
- [ ] Un cambio de precio en la API aparece en `/pricing` sin reconstruir el sitio (revalidación en cliente).
- [ ] Las pruebas de `web/` (incluida `test:dist`) y `scripts/verify-api.sh` terminan en verde.

---

## Dependencias Entre Tareas

```
Feature 008, 009, 011 (contrato) → 001
001 (lógica pura pública)        → 002
002 (rutas públicas)             → 004, 008
003 (variables de entorno)       → 004
004 (cliente y respaldo)         → 005, 006
005 (precios y planes)           → 007
006 (horario y disponibilidad)   → 007
007 (pruebas de web)             → 008
002-007                          → 008 (documentación y verificación)
```

---

## Validación Post-Deploy

1. `cd api && bun run build:ts && bun test` en verde; PocketBase arranca y responde `GET /api/public/catalog` con `200`.
2. `curl -i -H "Origin: https://fitness.juicyquisine.com" "$API/api/public/schedule?week=2026-11-15"`: `200`, `Access-Control-Allow-Origin` con ese origen, `Cache-Control: public, max-age=60...`, sin ids ni nombres de clientes.
3. Mismo `curl` con `Origin: https://otro.example`: sin `Access-Control-Allow-Origin`.
4. `curl "$API/api/public/schedule?week=2026-02-30"` → `400`.
5. `cd web && bun run build` con `PUBLIC_API_URL` apuntando a la API: `dist/pricing/index.html` contiene los precios reales. Repetir con la URL apagada: el build termina y usa los precios de respaldo.
6. Abrir `/schedule`: cupos y estados coinciden con las reservas de la app; apagar la API y recargar: aviso y clases sin cupos.
7. Cambiar un precio en la app y recargar `/pricing` sin reconstruir: se muestra el nuevo precio.
8. `scripts/verify-api.sh` y, en `web/`, `bun run lint && bun run format:check && bun run check && bun run test && bun run build && bun run test:dist` → en verde.

---

## Prompt y modelo utilizado

### Modelo

Sonnet 5.5

### Prompt

Contexto de la lista de características aprobada para esta feature: «019-catalogo-publico-en-web: que `web/` lea precios, planes, horarios y disponibilidad reales desde la API en lugar de `web/src/lib/data.ts` y la disponibilidad simulada de `web/src/lib/schedule.ts`: rutas públicas de solo lectura `GET /api/public/catalog` y `GET /api/public/schedule?week=` (sin datos personales, solo conteo de cupos y estado `available/almost/full`, con caché corta y CORS acotado al dominio del sitio por configuración), cliente en `web/src/lib/api.ts` con fallback a datos estáticos si la API falla, adaptación de `PricingCard`/`ScheduleBoard`/páginas (Astro SSR vs build estático: analizar `web/` y decidir/documentar: build con revalidación o isla Vue que consulta en cliente), pruebas existentes de `web/tests` actualizadas, variables de entorno (`web/src/lib/env.ts`). Sin integrar formularios (CRM fuera de alcance).»

```
Ok, con base en esta lista estructuremos los features que debemos implementar. Cada feature dejala plasmada en español en features/NNN-.../spec.md, crea las carpetas de ser necesario respetando el consecutivo, puedes usar features/spec-template.md como plantilla. Luego con base en ese spec crea las tareas granulares en features/NNN-.../tasks/NNN-....md, creando un consecutivo ordenado, tasks debidamente priorizadas teniendo en cuenta dependencias resueltas con anterioridad, puedes usar features/task-template.md como plantilla. Ten en cuenta la prelación entre unas y otras de manera de generar todo con la prioridad y orden adecuado.

(Descartado explícitamente el CRM/leads; comunicaciones solo propias del servicio.)
```
