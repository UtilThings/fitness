import assert from "node:assert/strict";
import { addLocalDays, localToUtc, utcToLocal } from "../api/src/lib/tz";

const base = process.argv[2];
const password = process.env.JQ_VERIFY_PASSWORD;
assert(base && password, "Ejecuta scripts/verify-api.sh");

type Body = Record<string, unknown>;
type Row = { id: string };
type Session = Row & { service: string; starts_at: string };
type Booking = Row & { status: string; waitlist_position: number; free_class: boolean; override_note: string };
type Availability = { session: string; booked: number; waitlisted: number; spots_left: number; availability: string };

async function call<T>(path: string, token = "", method = "GET", body?: Body, status = 200): Promise<T> {
  const response = await fetch(`${base}/api/${path}`, {
    method,
    headers: {
      ...(token && { Authorization: token }),
      ...(body && { "Content-Type": "application/json" }),
    },
    body: body && JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  });
  const data = await response.json();
  assert.equal(response.status, status, `${method} ${path}: ${JSON.stringify(data)}`);
  return data;
}

const records = (collection: string) => `collections/${collection}/records`;
const filter = (expression: string) => "?filter=" + encodeURIComponent(expression);
async function auth(collection: string, email: string) {
  const result = await call<{ token: string }>(
    `collections/${collection}/auth-with-password`, "", "POST", { identity: email, password },
  );
  return result.token;
}

const root = await auth("_superusers", "catalog-verify@example.test");
const { items: collections, totalItems: collectionCount } = await call<{
  items: { name: string; system: boolean; createRule: string | null }[];
  totalItems: number;
}>("collections?perPage=200", root);
assert.equal(collections.length, collectionCount);
assert(collections.find(({ name }) => name === "admins")?.createRule?.includes('role = "owner"'));
for (const collection of collections) {
  if (collection.system) continue;
  for (const [field, value] of Object.entries(collection)) {
    // Existing users can still authenticate with credentials. Public registration is locked.
    if (field.endsWith("Rule") && !(collection.name === "users" && field === "authRule")) {
      assert.notEqual(value, "", `Regla pública inesperada: ${collection.name}.${field}`);
    }
  }
}
await call("collections/users/records", "", "POST", {}, 403);
console.log("Reglas efectivas de las colecciones del MVP verificadas.");
async function createAdmin(role: "owner" | "coach" | "reception") {
  const email = `bookings-${role}@example.test`;
  await call(records("admins"), root, "POST", { email, name: role, role, active: true, password, passwordConfirm: password });
  return auth("admins", email);
}
const owner = await createAdmin("owner");
const coach = await createAdmin("coach");
const { items: plans } = await call<{ items: { service: string }[] }>(
  records("plans") + filter("is_first_class = true && active = true"), coach,
);
assert(plans.length > 0, "El catálogo debe incluir un plan de primera clase");

const now = Date.now();
function createSession(hours: number, capacity: number) {
  return call<Session>(records("class_sessions"), owner, "POST", {
    service: plans[0].service, starts_at: new Date(now + hours * 3_600_000).toISOString(), duration_min: 60, capacity,
  });
}

let clientNumber = 0;
function createClient() {
  return call<Row>(records("clients"), coach, "POST", {
    first_name: "Reserva", last_name: "Prueba " + ++clientNumber, status: "active",
  });
}

const bookings = records("bookings");
const bookingPath = ({ id }: Row) => `${bookings}/${id}`;
const availabilityPath = ({ id }: Row) => `admin/sessions/${id}/availability`;
function reserve(session: Row, client: Row, free = false) {
  return call<Booking>(bookings, coach, "POST", { session: session.id, client: client.id, use_free_class: free });
}
function read(booking: Row) {
  return call<Booking>(bookingPath(booking), coach);
}
function cancel(booking: Row, override_note?: string) {
  return call<Booking>(bookingPath(booking), coach, "PATCH", { status: "cancelled", override_note });
}
async function confirmFreeClass(client: Row, expected: boolean) {
  const result = await call<{ free_class_used: boolean }>(`${records("clients")}/${client.id}`, coach);
  assert.equal(result.free_class_used, expected);
}

const future = await createSession(240, 2);
const [firstClient, secondClient, thirdClient, fourthClient] = await Promise.all(
  Array.from({ length: 4 }, createClient),
);
const first = await reserve(future, firstClient, true);
assert.equal(first.status, "booked");
assert.equal(first.free_class, true);
await confirmFreeClass(firstClient, true);

const pair = await Promise.all([reserve(future, secondClient), reserve(future, thirdClient)]);
assert.deepEqual(pair.map(({ status }) => status).sort(), ["booked", "waitlisted"]);
const waiting = pair.find((booking) => booking.status === "waitlisted")!;
assert.equal(waiting.waitlist_position, 1);
const next = await reserve(future, fourthClient);
assert.equal(next.waitlist_position, 2);
assert.equal((await cancel(first)).status, "cancelled");
await confirmFreeClass(firstClient, false);
assert.equal((await read(waiting)).status, "booked");
assert.equal((await read(next)).waitlist_position, 1);
assert.equal((await reserve(future, firstClient)).id, first.id);

const soon = await createSession(1, 1);
const late = await reserve(soon, firstClient, true);
const exception = await reserve(soon, secondClient);
assert.equal((await cancel(late)).status, "late_cancelled");
await confirmFreeClass(firstClient, true);
assert.equal((await read(exception)).status, "booked");
const rejected = await call<{ data: Body }>(
  bookingPath(exception), coach, "PATCH", { status: "cancelled", override: true }, 400,
);
assert(rejected.data.override_note);
assert.equal((await cancel(exception, "Emergencia")).status, "cancelled");

const present = await reserve(soon, thirdClient);
await call(bookingPath(present), coach, "PATCH", { status: "attended" }, 400);
await call(`${records("class_sessions")}/${soon.id}`, owner, "PATCH", { starts_at: new Date(now - 1_000).toISOString() });
assert.equal((await call<Booking>(bookingPath(present), coach, "PATCH", { status: "attended" })).status, "attended");

const full = await call<Availability>(availabilityPath(future), coach);
assert.equal(full.booked, 2);
assert.equal(full.waitlisted, 2);
assert.equal(full.spots_left, 0);
assert.equal(full.availability, "full");
await call(availabilityPath(future), "", "GET", undefined, 401);
const date = utcToLocal(future.starts_at.replace(" ", "T")).date;
const range = `admin/sessions/availability?from=${date}&to=${addLocalDays(date, 1)}`;
assert.deepEqual((await call<Availability[]>(range, coach)).find((row) => row.session === future.id), full);

const blocked = await createSession(480, 1);
const free = await reserve(blocked, fourthClient, true);
const queue = await reserve(blocked, secondClient);
const blockDate = utcToLocal(blocked.starts_at.replace(" ", "T")).date;
await call(records("schedule_blocks"), owner, "POST", {
  title: "Cierre de prueba de reservas", date_from: blockDate, date_to: blockDate,
});
for (const entry of [free, queue]) {
  const cancelled = await read(entry);
  assert.equal(cancelled.status, "cancelled");
  assert.equal(cancelled.override_note, "session_cancelled");
  assert.equal(cancelled.waitlist_position, 0);
}
await confirmFreeClass(fourthClient, false);

const logs = records("audit_logs") + filter('collection = "bookings"') + "&perPage=100";
const { items } = await call<{ items: { id: string; actor: string; summary: string; diff: { status?: { to?: string } } }[] }>(logs, owner);
for (const event of ["created", "waitlisted", "promoted", "cancelled", "late_cancelled", "attended", "cancelled_by_session"]) {
  assert(items.some((item) => item.actor && item.summary.startsWith(`booking.${event}: `)), event);
}

assert(items.some((item) => item.summary.startsWith("booking.waitlisted: ") && item.diff?.status?.to === "waitlisted"),
  "El diff de auditoría debe conservar los cambios al persistirlos.");

console.log("Reservas, concurrencia, cancelación, asistencia, disponibilidad y auditoría verificadas.");

const dashboardPath = "admin/dashboard";
for (const days of ["0", "30", "1.5", ""]) {
  await call(dashboardPath + "?days=" + days, coach, "GET", undefined, 400);
}
await call(dashboardPath, "", "GET", undefined, 401);
await call(dashboardPath, root, "GET", undefined, 403);
const legacyEmail = "legacy-verify@example.test";
await call(records("users"), root, "POST", { email: legacyEmail, password, passwordConfirm: password });
await call(dashboardPath, await auth("users", legacyEmail), "GET", undefined, 403);

const today = utcToLocal(new Date().toISOString()).date;
async function createAt(localDate: string, coachId = "") {
  return call<Session>(records("class_sessions"), owner, "POST", {
    service: plans[0].service, starts_at: localToUtc(localDate, "23:30"), duration_min: 30, capacity: 4, coach: coachId,
  });
}
const ownerId = (await call<{ record: Row }>("collections/admins/auth-refresh", owner, "POST")).record.id;
const midnightClass = await createAt(today, ownerId);
const previousClass = await createAt(addLocalDays(today, -1));
const nextClass = await createAt(addLocalDays(today, 1));
const dashboard = await call<{
  generated_at: string;
  timezone: string;
  today: { date: string; start_utc: string; end_utc: string };
  counts: { active_clients: number; sessions_today: number; bookings_today: number; waitlisted_today: number };
  sessions_today: {
    id: string; service: Row; coach: Row | null; booked: number; waitlisted: number; spots_left: number; availability: string;
  }[];
  attention: { session_id: string; reason: string }[];
  upcoming_payments: null;
}>(dashboardPath, coach);
assert.equal(dashboard.timezone, "America/New_York");
assert.equal(dashboard.today.date, utcToLocal(dashboard.generated_at).date);
assert.equal(dashboard.today.start_utc, localToUtc(dashboard.today.date, "00:00"));
assert.equal(dashboard.today.end_utc, localToUtc(addLocalDays(dashboard.today.date, 1), "00:00"));
const evening = dashboard.sessions_today.find(({ id }) => id === midnightClass.id);
assert(evening);
assert.equal(evening.service.id, plans[0].service);
assert.equal(evening.coach?.id, ownerId);
assert.equal(evening.spots_left, 4);
assert.equal(evening.availability, "available");
assert(!dashboard.sessions_today.some(({ id }) => id === previousClass.id || id === nextClass.id));
assert(!dashboard.attention.some(({ session_id }) => session_id === previousClass.id));
for (const reason of ["no_coach", "no_bookings"]) {
  assert(dashboard.attention.some((entry) => entry.session_id === nextClass.id && entry.reason === reason));
}
assert(!dashboard.attention.some(({ session_id }) => session_id === future.id));
assert.equal(dashboard.counts.sessions_today, dashboard.sessions_today.length);
const asRecordDate = (iso: string) => iso.replace("T", " ");
const dayFilter = `starts_at >= "${asRecordDate(dashboard.today.start_utc)}" && starts_at < "${asRecordDate(dashboard.today.end_utc)}"`;
const { items: calendar, totalItems: calendarTotal } = await call<{ items: Session[]; totalItems: number }>(
  records("class_sessions") + filter(dayFilter + ' && (status = "scheduled" || status = "completed")') + "&perPage=200",
  coach,
);
assert.equal(calendar.length, calendarTotal);
assert.deepEqual(dashboard.sessions_today.map(({ id }) => id).sort(), calendar.map(({ id }) => id).sort());
const dailyBookings = await Promise.all(calendar.map(async ({ id }) => {
  const { items, totalItems } = await call<{ items: Booking[]; totalItems: number }>(
    bookings + filter(`session = "${id}"`) + "&perPage=200",
    coach,
  );
  assert.equal(items.length, totalItems);
  return items;
}));
assert.equal(dashboard.counts.bookings_today,
  dailyBookings.flat().filter(({ status }) => ["booked", "attended", "no_show"].includes(status)).length);
assert.equal(dashboard.counts.waitlisted_today, dailyBookings.flat().filter(({ status }) => status === "waitlisted").length);
const { totalItems: activeClients } = await call<{ totalItems: number }>(
  records("clients") + filter('status = "active"') + "&perPage=1", coach,
);
assert.equal(dashboard.counts.active_clients, activeClients);
assert(activeClients >= 4);
assert.equal(dashboard.upcoming_payments, null);
assert(!JSON.stringify(dashboard).includes(firstClient.id));
console.log("Contrato, permisos y ventana local del dashboard verificados.");

const reception = await createAdmin("reception");
const auditCollection = await call<Row>("collections/audit_logs", root);
for (const token of [coach, reception]) {
  for (const path of [
    records("audit_logs"), records(auditCollection.id), `${records("audit_logs")}/${items[0].id}`,
  ]) {
    const { exitCode, stdout } = Bun.spawnSync([
      "curl", "--noproxy", "*", "--silent", "--show-error", "--max-time", "5",
      "--output", "/dev/null", "--write-out", "%{http_code}", "-H", "Authorization: " + token,
      `${base}/api/${path}`,
    ]);
    assert.equal(exitCode, 0);
    assert.equal(stdout.toString(), "403");
  }
}
console.log("Auditoría: acceso de owner y HTTP 403 para coach y recepción verificados.");
