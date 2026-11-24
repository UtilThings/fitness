import assert from "node:assert/strict";
import { Database } from "bun:sqlite";

const base = process.argv[2];
const password = process.env.JQ_VERIFY_PASSWORD;
const business = process.env.JQ_VERIFY_BUSINESS!;
const dbPath = process.env.JQ_VERIFY_DB;
assert(base && password && dbPath, "Ejecuta scripts/verify-api.sh");

async function auth(role: string) {
  const response = await fetch(`${base}/api/collections/admins/auth-with-password`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: `${role}@catalog-verify.example.test`, password }),
  });
  assert.equal(response.status, 200);
  return (await response.json()).token as string;
}

const [owner, coach, reception] = await Promise.all(["owner", "coach", "reception"].map(auth));
const kinds = ["occupancy", "attendance", "revenue", "retention"] as const;
type Kind = typeof kinds[number];
const params = { from: "2040-03-11", to: "2040-03-11" }; // US spring transition
const exposures = /reporteprivado|secret@example\.test|9182736450|first_name|last_name|"client"|"phone"|"email"/i;

async function report(kind: Kind, token: string, query: Record<string, string> = params, status = 200) {
  const response = await fetch(`${base}/api/admin/reports/${kind}?${new URLSearchParams(query)}`, {
    headers: token ? { Authorization: token } : {},
    signal: AbortSignal.timeout(5000),
  });
  const body = await response.json();
  assert.equal(response.status, status, `${kind}: ${JSON.stringify(body)}`);
  if (status === 200) assert.doesNotMatch(JSON.stringify(body), exposures);
  return body;
}

const db = new Database(dbPath);
const plan = db.query<{ id: string; service: string; slug: string }, []>(
  "SELECT plans.id, plans.service, services.slug FROM plans JOIN services ON services.id = plans.service LIMIT 1",
).get();
const admin = db.query<{ id: string }, []>("SELECT id FROM admins WHERE role = 'owner' LIMIT 1").get();
assert(plan && admin);
const existingMemberships = db.query<{ count: number }, []>(
  "SELECT count(*) AS count FROM memberships WHERE starts_on < '2040-03-11' " +
  "AND (status IN ('active', 'paused') OR ended_on = '')",
).get()!.count;
db.transaction(() => {
  db.run("INSERT INTO clients (business, id, first_name, last_name, email, phone, status) VALUES (?, ?, ?, ?, ?, ?, 'active')",
    [business, "verifyreport001", "ReportePrivado", "ReportePrivado", "secret@example.test", "9182736450"]);
  for (const [id, startsAt] of [
    ["reportssession1", "2040-03-11 05:00:00.000Z"],
    ["reportssession2", "2040-03-12 04:00:00.000Z"],
  ]) {
    db.run("INSERT INTO class_sessions (business, id, service, coach, starts_at, duration_min, capacity, status, kind) VALUES (?, ?, ?, ?, ?, 60, 6, 'completed', 'regular')",
      [business, id, plan.service, admin.id, startsAt]);
    db.run("INSERT INTO bookings (business, session, client, status) VALUES (?, ?, ?, 'attended')", [business, id, "verifyreport001"]);
  }
  db.run(
    "INSERT INTO memberships (business, id, client, plan, status, starts_on, ended_on, current_period_start, current_period_end) VALUES (?, ?, ?, ?, 'expired', ?, ?, ?, ?)",
    [business, "reportmember001", "verifyreport001", plan.id, "2040-03-01 00:00:00.000Z", "2040-03-11 00:00:00.000Z",
      "2040-03-01 00:00:00.000Z", "2040-03-10 00:00:00.000Z"],
  );
  db.run("INSERT INTO payments (business, currency, client, plan, status, amount_cents, recorded_by, paid_at) VALUES (?, 'USD', ?, ?, 'paid', 8000, ?, ?)",
    [business, "verifyreport001", plan.id, admin.id, "2040-03-12 03:59:59.999Z"]);
  db.run("INSERT INTO payments (business, currency, client, plan, status, amount_cents, recorded_by, due_on) VALUES (?, 'USD', ?, ?, 'pending', 500, ?, ?)",
    [business, "verifyreport001", plan.id, admin.id, "2040-03-11 00:00:00.000Z"]);
})();
db.close();

for (const kind of kinds) {
  await report(kind, "", params, 401);
  const body = await report(kind, owner);
  assert.deepEqual(body.range, {
    ...params, timezone: "America/New_York",
    start_utc: "2040-03-11T05:00:00.000Z", end_utc: "2040-03-12T04:00:00.000Z",
  });
  for (const token of [coach, reception]) await report(kind, token, params, kind === "revenue" ? 403 : 200);
}
const occupancy = await report("occupancy", coach, { ...params, service: plan.slug });
assert.equal(occupancy.totals.sessions, 1);
assert.equal(occupancy.totals.booked, 1);
assert.equal(occupancy.by_class[0].local_time, "00:00");
const attendance = await report("attendance", coach);
assert.equal(attendance.totals.attended, 1);
assert.equal(attendance.by_day[0].day, params.from);
const revenue = await report("revenue", owner, { ...params, service: plan.slug, group_by: "day" });
assert.deepEqual(revenue.totals, { paid_cents: 8000, pending_cents: 500, void_cents: 0, payments: 2 });
assert.deepEqual(revenue.by_period, [{ period: params.from, paid_cents: 8000, payments: 1 }]);
const retention = await report("retention", coach, { ...params, group_by: "week" });
const churnRate = Math.round(10_000 / (existingMemberships + 1)) / 10_000;
assert.deepEqual(retention.totals, {
  active_start: existingMemberships + 1, new: 0, churned: 1, active_end: existingMemberships,
  churn_rate: churnRate, retention_rate: 1 - churnRate,
});
assert.deepEqual(retention.by_period, [{ period: params.from, new: 0, churned: 1, active_end: existingMemberships }]);
const empty = await report("occupancy", owner, { from: "2000-01-01", to: "2000-01-01" });
assert.deepEqual(empty.totals, { sessions: 0, capacity: 0, booked: 0, occupancy_rate: 0 });
for (const query of [
  {}, { from: params.from }, { to: params.to },
  { from: "2040-02-30", to: params.to }, { from: "2040-04-01", to: params.to },
  { from: "2040-01-01", to: "2041-01-01" }, { ...params, service: "no-existe" },
  { ...params, group_by: "hora" }, { from: "2040-01-01", to: "2040-04-03", group_by: "day" },
]) {
  const error = await report("revenue", owner, query as Record<string, string>, 400);
  assert.match(error.message, /^(Indica fechas|La fecha final|El rango|El servicio|La agrupación)/);
}
console.log("Reportes: contratos, permisos, privacidad, filtros y límites locales verificados.");
