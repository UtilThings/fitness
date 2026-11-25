import assert from "node:assert/strict";
import { Database } from "bun:sqlite";
import { addLocalDays, startOfLocalDay, utcToLocal } from "../api/src/lib/tz";
import { normalizeWeek } from "../api/src/lib/public-catalog";

const [base, database, log] = process.argv.slice(2);
const allowed = "https://fitness.example.test";
const denied = "https://denied.example.test";
const cache = "no-store";
const business = process.env.JQ_VERIFY_BUSINESS!;
const timezone = "America/New_York";
const db = new Database(database);
const week = normalizeWeek(undefined, utcToLocal(new Date().toISOString(), timezone).date);

async function api(path: string, method: string, payload: unknown, token?: string) {
  const response = await fetch(`${base}/api/${path}`, {
    method, headers: { "Content-Type": "application/json", ...(token && { Authorization: token }) }, body: JSON.stringify(payload),
  });
  const data = await response.json();
  assert.equal(response.status, 200, JSON.stringify(data));
  return data;
}
async function auth(collection: string, identity: string) {
  return (await api(`collections/${collection}/auth-with-password`, "POST", {
    identity, password: process.env.JQ_VERIFY_PASSWORD,
  })).token as string;
}
const owner = await auth("admins", "owner@catalog-verify.example.test");
const root = await auth("_superusers", "catalog-verify@example.test");
await api(`collections/businesses/records/${business}`, "PATCH", { allowed_origins: [allowed] }, owner);
const rotate = (token: string) => api("admin/business/public-key", "POST", {}, token);
const old = await rotate(owner);
const current = (await rotate(owner)).key;
const otherOrigin = "https://bogota.example.test";
const other = await api("collections/businesses/records", "POST", {
  name: "Bogotá Fitness", slug: "bogota-fitness", currency: "COP", timezone: "America/Bogota",
  receipt_prefix: "BOG", active: true, allowed_origins: [otherOrigin],
}, root);
await api("collections/admins/records", "POST", {
  business: other.id, email: "public-bogota@example.test", role: "owner", active: true,
  password: process.env.JQ_VERIFY_PASSWORD, passwordConfirm: process.env.JQ_VERIFY_PASSWORD,
}, root);
const otherOwner = await auth("admins", "public-bogota@example.test");
const otherKey = (await rotate(otherOwner)).key;
const ownOtherService = await api("collections/services/records", "POST", {
  name: "Bogotá Strength", slug: "group-strength", kind: "group", capacity: 6,
}, otherOwner);
await api("collections/plans/records", "POST", {
  name: "Bogotá plan", service: ownOtherService.id, price_cents: 10000, billing_unit: "per_4_weeks",
}, otherOwner);

function publicFetch(path: string, origin?: string, method = "GET", key: string | null = current) {
  return fetch(`${base}/api/public/${path}`, {
    method, headers: {
      ...(origin && { Origin: origin }),
      ...(method === "OPTIONS" ? { "Access-Control-Request-Method": "GET", "Access-Control-Request-Headers": "X-Business-Key" }
        : key && { "X-Business-Key": key }),
    },
  });
}

function columns(value: object, keys: string) {
  assert.deepEqual(Object.keys(value).sort(), keys.split(" ").sort());
}

const catalogResponse = await publicFetch("catalog", allowed);
assert.equal(catalogResponse.status, 200);
assert.equal(catalogResponse.headers.get("access-control-allow-origin"), allowed);
assert.equal(catalogResponse.headers.get("cache-control"), cache);
assert.match(catalogResponse.headers.get("vary") ?? "", /\bOrigin\b/i);
const catalog = await catalogResponse.json();
columns(catalog, "version business currency services");
columns(catalog.business, "name city logo_url currency timezone");
assert.equal(catalog.version, 2);
assert(!JSON.stringify(catalog).includes("Bogotá"));
assert.equal(catalog.currency, "USD");
assert.ok(catalog.services.length > 0);
assert.ok(catalog.services.some((service: { plans: unknown[] }) => service.plans.length));
assert.ok(catalog.services.some((service: { weekly_times: unknown[] }) => service.weekly_times.length));
for (const service of catalog.services) {
  columns(service, "slug kind name plans weekly_times");
  for (const plan of service.plans) {
    columns(plan, "name price_cents billing_unit sessions per_week commitment_periods is_first_class partner note");
  }
  for (const slot of service.weekly_times) columns(slot, "weekday time coach_name capacity");
}

const queries = async (table: string) => (await Bun.file(log).text()).split("\n")
  .filter((line) => line.includes("SELECT") && line.includes(table)).length;
const catalogQueries = await queries("`plans`");
assert.ok(catalogQueries > 0);
const cachedCatalog = await publicFetch("catalog", denied);
assert.equal(cachedCatalog.status, 200);
assert.equal(cachedCatalog.headers.get("access-control-allow-origin"), null);
assert.deepEqual(await cachedCatalog.json(), catalog);
assert.equal(await queries("`plans`"), catalogQueries);

for (const path of ["catalog", "schedule"]) {
  assert.equal((await publicFetch(path, denied, "OPTIONS")).headers.get("access-control-allow-origin"), null);
  const preflight = await publicFetch(path, allowed, "OPTIONS");
  assert.equal(preflight.headers.get("access-control-allow-origin"), allowed);
  assert.equal(preflight.headers.get("access-control-allow-headers"), "X-Business-Key");
  for (const key of [null, old.key, "pk_invalid1_00000000000000000000000000000000"]) {
    const response = await publicFetch(path, allowed, "GET", key);
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { message: "The API key is invalid." });
  }
}
for (const input of ["2026-02-30", "2099-01-01", ""]) {
  const response = await publicFetch(`schedule?week=${input}`, allowed);
  assert.equal(response.status, 400);
  assert.equal(response.headers.get("cache-control"), null);
  columns(await response.json(), "message");
}

const service = db.query("SELECT id, slug, name FROM services WHERE slug = 'group-strength' AND business = ?").get(business) as
  { id: string; slug: string; name: string };
const date = addLocalDays(week, 3);
const start = (hour: number) => new Date(Date.parse(startOfLocalDay(date, timezone)) + hour * 3_600_000)
  .toISOString().replace("T", " ");
const insertSession = db.query("INSERT INTO class_sessions (business, id, service, starts_at, capacity, status, kind, notes) VALUES (?, ?, ?, ?, 6, ?, ?, 'internal only')");
const fixture = "pubsession00001";
insertSession.run(business, fixture, service.id, start(1), "scheduled", "special");
insertSession.run(business, "pubsession00002", service.id, start(2), "scheduled", "private");
insertSession.run(business, "pubsession00003", service.id, start(3), "cancelled", "regular");
const insertBooking = db.query("INSERT INTO bookings (business, id, session, client, status, source) VALUES (?, ?, ?, ?, ?, 'admin')");
for (const [index, status] of ["booked", "attended", "no_show", "booked", "waitlisted", "cancelled", "late_cancelled"].entries()) {
  insertBooking.run(business, `pubbooking0000${index}`, fixture, `pubclient00000${index}`, status);
}

const response = await publicFetch(`schedule?week=${date}`, allowed);
assert.equal(response.status, 200);
assert.equal(response.headers.get("access-control-allow-origin"), allowed);
assert.equal(response.headers.get("cache-control"), cache);
assert.equal(response.headers.get("x-public-schedule-max-weeks"), "8");
assert.match(response.headers.get("access-control-expose-headers") ?? "", /x-public-schedule-max-weeks/i);
const schedule = await response.json();
columns(schedule, "version business timezone week_start week_end sessions");
assert.equal(schedule.version, 2);
assert.equal(schedule.timezone, "America/New_York");
assert.equal(schedule.week_start, week);
assert.equal(schedule.week_end, addLocalDays(week, 6));
assert.ok(schedule.sessions.some((session: { local_time: string }) => session.local_time === "01:00"));
for (const session of schedule.sessions) {
  columns(session, "local_date local_time service coach_name capacity spots_left status");
  columns(session.service, "slug name");
}
assert.deepEqual(schedule.sessions.filter((session: { local_date: string; local_time: string }) =>
  session.local_date === date && session.local_time <= "03:00"), [{
  local_date: date, local_time: "01:00", service: { slug: service.slug, name: service.name },
  coach_name: "", capacity: 6, spots_left: 2, status: "almost",
}]);
const scheduleQueries = await queries("`class_sessions`");
assert.ok(scheduleQueries > 0);
const cachedSchedule = await publicFetch(`schedule?week=${week}`, denied);
assert.equal(cachedSchedule.headers.get("access-control-allow-origin"), null);
assert.deepEqual(await cachedSchedule.json(), schedule);
assert.equal(await queries("`class_sessions`"), scheduleQueries);

const theirCatalog = await publicFetch("catalog", otherOrigin, "GET", otherKey);
assert.equal(theirCatalog.headers.get("access-control-allow-origin"), otherOrigin);
const theirData = await theirCatalog.json();
assert.equal(theirData.currency, "COP");
assert.deepEqual(theirData.services.map(({ name }) => name), ["Bogotá Strength"]);
assert.equal(theirData.services[0].plans[0].name, "Bogotá plan");
assert.equal((await publicFetch("catalog", allowed, "GET", otherKey)).headers.get("access-control-allow-origin"), null);
insertSession.run(other.id, "pubsession00004", ownOtherService.id, start(5), "scheduled", "regular");
const otherScheduleResponse = await publicFetch(`schedule?week=${week}`, otherOrigin, "GET", otherKey);
assert.equal(otherScheduleResponse.status, 200);
const otherSchedule = await otherScheduleResponse.json();
assert.equal(otherSchedule.timezone, "America/Bogota");
assert.equal(otherSchedule.week_start, schedule.week_start);
assert.deepEqual(otherSchedule.sessions.map(({ service }) => service.name), ["Bogotá Strength"]);
for (const body of [catalog, schedule, theirData, otherSchedule]) {
  assert.doesNotMatch(JSON.stringify(body), /"(email|client|phone|notes|id)":/);
}
await api(`collections/businesses/records/${other.id}`, "PATCH", { active: false }, root);
for (const path of ["catalog", "schedule"]) {
  const response = await publicFetch(path, otherOrigin, "GET", otherKey);
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { message: "The API key is invalid." });
}

// This database belongs exclusively to verify-api.sh. Simulate a database failure and restore it.
db.run("ALTER TABLE class_sessions RENAME TO verify_hidden_sessions");
try {
  const failure = await publicFetch(`schedule?week=${addLocalDays(week, 7)}`);
  assert.equal(failure.status, 500);
  assert.equal(failure.headers.get("cache-control"), null);
  assert.deepEqual(await failure.json(), { message: "Could not load the public data." });
} finally {
  db.run("ALTER TABLE verify_hidden_sessions RENAME TO class_sessions");
  db.close();
}
console.log("Catálogo y horario públicos verificados");
