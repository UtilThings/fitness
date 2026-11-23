import assert from "node:assert/strict";
import { Database } from "bun:sqlite";
import { addLocalDays, startOfLocalDay, utcToLocal } from "../api/src/lib/tz";
import { normalizeWeek } from "../api/src/lib/public-catalog";

const [base, database, log] = process.argv.slice(2);
const allowed = "https://fitness.example.test";
const denied = "https://denied.example.test";
const cache = "public, max-age=60, stale-while-revalidate=300";
const db = new Database(database);
const week = normalizeWeek(undefined, utcToLocal(new Date().toISOString()).date);

function publicFetch(path: string, origin?: string, method = "GET") {
  return fetch(`${base}/api/public/${path}`, { method, headers: origin ? { Origin: origin } : {} });
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
columns(catalog, "version currency services");
assert.equal(catalog.version, 1);
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
  assert.equal((await publicFetch(path, allowed, "OPTIONS")).headers.get("access-control-allow-origin"), allowed);
}
for (const input of ["2026-02-30", "2099-01-01", ""]) {
  const response = await publicFetch(`schedule?week=${input}`, allowed);
  assert.equal(response.status, 400);
  assert.equal(response.headers.get("cache-control"), null);
  columns(await response.json(), "message");
}

const service = db.query("SELECT id, slug, name FROM services WHERE slug = 'group-strength'").get() as
  { id: string; slug: string; name: string };
const date = addLocalDays(week, 3);
const start = (hour: number) => new Date(Date.parse(startOfLocalDay(date)) + hour * 3_600_000)
  .toISOString().replace("T", " ");
const insertSession = db.query("INSERT INTO class_sessions (id, service, starts_at, capacity, status, kind, notes) VALUES (?, ?, ?, 6, ?, ?, 'internal only')");
const fixture = "pubsession00001";
insertSession.run(fixture, service.id, start(1), "scheduled", "special");
insertSession.run("pubsession00002", service.id, start(2), "scheduled", "private");
insertSession.run("pubsession00003", service.id, start(3), "cancelled", "regular");
const insertBooking = db.query("INSERT INTO bookings (id, session, client, status, source) VALUES (?, ?, ?, ?, 'admin')");
for (const [index, status] of ["booked", "attended", "no_show", "booked", "waitlisted", "cancelled", "late_cancelled"].entries()) {
  insertBooking.run(`pubbooking0000${index}`, fixture, `pubclient00000${index}`, status);
}

const response = await publicFetch(`schedule?week=${date}`, allowed);
assert.equal(response.status, 200);
assert.equal(response.headers.get("access-control-allow-origin"), allowed);
assert.equal(response.headers.get("cache-control"), cache);
assert.equal(response.headers.get("x-public-schedule-max-weeks"), "8");
assert.match(response.headers.get("access-control-expose-headers") ?? "", /x-public-schedule-max-weeks/i);
const schedule = await response.json();
columns(schedule, "version timezone week_start week_end sessions");
assert.equal(schedule.version, 1);
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

// This database belongs exclusively to verify-api.sh. Simulate a database failure and restore it.
db.run("ALTER TABLE class_sessions RENAME TO verify_hidden_sessions");
try {
  const failure = await publicFetch(`schedule?week=${addLocalDays(week, 7)}`);
  assert.equal(failure.status, 500);
  assert.equal(failure.headers.get("cache-control"), null);
  assert.deepEqual(await failure.json(), { message: "No se pudieron cargar los datos públicos." });
} finally {
  db.run("ALTER TABLE verify_hidden_sessions RENAME TO class_sessions");
  db.close();
}
console.log("Catálogo y horario públicos verificados");
