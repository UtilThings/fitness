import assert from "node:assert/strict";
import { Database } from "bun:sqlite";
import { addDays } from "../api/src/lib/membership-cycles";
import { utcToLocal as toBusinessLocal } from "../api/src/lib/tz";
const utcToLocal = (value: string) => toBusinessLocal(value, "America/New_York");

const base = process.argv[2];
const password = process.env.JQ_VERIFY_PASSWORD;
assert(base && password, "Ejecuta scripts/verify-api.sh");

type Row = { id: string };
type Body = Record<string, unknown>;

async function call<T>(path: string, token = "", method = "GET", body?: Body, expected = 200): Promise<T> {
  const response = await fetch(`${base}/api/${path}`, {
    method,
    headers: { ...(token && { Authorization: token }), ...(body && { "Content-Type": "application/json" }) },
    body: body && JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  });
  const data = await response.json();
  assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(data)}`);
  return data;
}

const records = (collection: string) => `collections/${collection}/records`;
const filter = (expression: string, options: Record<string, string> = {}) =>
  "?" + new URLSearchParams({ ...options, filter: expression });
async function auth(collection: string, identity: string) {
  return call<{ token: string; record: Row }>(`collections/${collection}/auth-with-password`, "", "POST", { identity, password });
}

const { token: root } = await auth("_superusers", "catalog-verify@example.test");
const { token: owner, record: ownerRecord } = await auth("admins", "owner@catalog-verify.example.test");
const { token: coach, record: coachRecord } = await auth("admins", "coach@catalog-verify.example.test");
const { token: reception } = await auth("admins", "reception@catalog-verify.example.test");
const today = utcToLocal(new Date().toISOString()).date;
const client = await call<Row>(records("clients"), reception, "POST", {
  first_name: "Online", last_name: "Coaching", status: "active",
});
const service = await call<Row>(records("services"), owner, "POST", {
  name: "Coaching remoto", slug: "verify-coaching-remoto", kind: "online", active: true,
});
const plan = await call<Row>(records("plans"), owner, "POST", {
  service: service.id, name: "Programa remoto", billing_unit: "per_4_weeks",
  price_cents: 10000, commitment_periods: 3, active: true,
});
type Membership = Row & { current_period_end: string };
const { membership, movement } = await call<{ membership: Membership; movement: unknown }>(
  "admin/memberships/assign", reception, "POST", { client: client.id, plan: plan.id, starts_on: today },
);
assert.equal(movement, null);
const programs = records("coaching_programs");
const checkins = records("coaching_checkins");
const input = {
  client: client.id, coach: ownerRecord.id, membership: membership.id,
  status: "active", starts_on: today, duration_weeks: 12,
};
await call(programs, reception, "POST", { ...input, membership: "" }, 400);
await call(programs, reception, "POST", { ...input, duration_weeks: 10 }, 400);
const otherClient = await call<Row>(records("clients"), reception, "POST", {
  first_name: "Sin plan", last_name: "Online", status: "active",
});
await call(programs, reception, "POST", { ...input, client: otherClient.id }, 400);
const { items: [onsitePlan] } = await call<{ items: Row[] }>(
  records("plans") + filter("service.kind = 'group' && active = true && billing_unit = 'per_4_weeks'"), owner,
);
const { membership: onsite } = await call<{ membership: Membership }>(
  "admin/memberships/assign", reception, "POST", { client: otherClient.id, plan: onsitePlan.id, starts_on: today },
);
await call(programs, reception, "POST", { ...input, client: otherClient.id, membership: onsite.id }, 400);

const ended = await call<Row>(programs, reception, "POST", input);
await call(programs, owner, "POST", input, 400);
await call(`${programs}/${ended.id}`, owner, "PATCH", { status: "ended" });
type Program = Row & { status: string; renews_on: string };
const program = await call<Program>(programs, reception, "POST", { ...input, renews_on: today });
assert.equal(program.renews_on.slice(0, 10), addDays(membership.current_period_end.slice(0, 10), 1));
await call(`${programs}/${ended.id}`, owner, "PATCH", { status: "active" }, 400);
const checkin = { program: program.id, checked_at: today, adherence: 4 };
for (const adherence of [0, 6]) {
  await call(checkins, owner, "POST", { ...checkin, adherence }, 400);
}
await call(checkins, coach, "POST", checkin, 400);
await call(checkins, reception, "POST", checkin, 400);
await call(checkins, owner, "POST", { ...checkin, checked_at: addDays(today, 1) }, 400);
await call(checkins, owner, "POST", { ...checkin, program: ended.id }, 400);
const saved = await call<Row & { created_by: string }>(checkins, owner, "POST", { ...checkin, created_by: coachRecord.id });
assert.equal(saved.created_by, ownerRecord.id);
await call(`${checkins}/${saved.id}`, owner, "PATCH", { checked_at: addDays(today, 1) }, 400);
await call<{ items: Row[] }>(checkins + filter(`program = '${program.id}'`), reception)
  .then(({ items }) => assert.equal(items.length, 1));

const { membership: otherOnline } = await call<{ membership: Membership }>(
  "admin/memberships/assign", reception, "POST", { client: otherClient.id, plan: plan.id, starts_on: today },
);
const coached = await call<Row>(programs, coach, "POST", {
  ...input, client: otherClient.id, membership: otherOnline.id, coach: coachRecord.id,
});
type Checkin = Row & { created: string; created_by: string; adherence: number };
const first = await call<Checkin>(checkins, coach, "POST", { ...checkin, program: coached.id, adherence: 2 });
await Bun.sleep(2); // PocketBase timestamps have millisecond precision.
const latest = await call<Checkin>(checkins, coach, "POST", { ...checkin, program: coached.id, adherence: 5 });
assert.equal(latest.created_by, coachRecord.id);
assert(first.created < latest.created);
const { items: history } = await call<{ items: Checkin[] }>(
  checkins + filter(`program = '${coached.id}'`, { sort: "-checked_at,-created,-id" }), reception,
);
assert.deepEqual(history.map(({ adherence }) => adherence), [5, 2]);

const { items: eligible } = await call<{ items: (Row & { expand: { client: Row; plan: Row } })[] }>(
  records("memberships") + filter(`plan.service.kind = 'online' && status = 'active' && client = '${otherClient.id}'`,
    { expand: "client,plan" }), coach,
);
assert.deepEqual(eligible.map(({ id, expand }) => [id, expand.client.id, expand.plan.id]),
  [[otherOnline.id, otherClient.id, plan.id]]);
const { items: filtered } = await call<{ items: (Program & { expand: { client: Row; coach: Row; membership: Row } })[] }>(
  programs + filter(`coach = '${coachRecord.id}' && status = 'active' && (client.first_name ~ 'Sin' || client.last_name ~ 'Sin')`,
    { expand: "client,coach,membership" }), reception,
);
assert.deepEqual(filtered.map(({ id, expand }) => [id, expand.client.id, expand.coach.id, expand.membership.id]),
  [[coached.id, otherClient.id, coachRecord.id, otherOnline.id]]);

const action = (name: string, body: Body = {}, expected = 200) =>
  call<{ membership: Membership }>(`admin/memberships/${membership.id}/${name}`, reception, "POST", body, expected);
const readProgram = () => call<Program>(`${programs}/${program.id}`, owner);
const dbPath = process.env.JQ_VERIFY_DB;
assert(dbPath);
const db = new Database(dbPath);
db.exec(`CREATE TRIGGER verify_coaching_rollback BEFORE UPDATE OF renews_on ON coaching_programs
  WHEN NEW.renews_on != OLD.renews_on
  BEGIN SELECT RAISE(ABORT, 'verify coaching rollback'); END`);
try {
  await action("renew", {}, 400);
  const current = await call<Membership>(`${records("memberships")}/${membership.id}`, owner);
  assert.equal(current.current_period_end, membership.current_period_end);
  assert.equal((await readProgram()).renews_on, program.renews_on);
} finally {
  db.exec("DROP TRIGGER verify_coaching_rollback");
  db.close();
}
const renewed = await action("renew");
assert.equal((await readProgram()).renews_on.slice(0, 10), addDays(renewed.membership.current_period_end.slice(0, 10), 1));
assert.equal((await readProgram()).renews_on.slice(0, 10), addDays(program.renews_on.slice(0, 10), 28));
await action("pause", { note: "Viaje" });
assert.equal((await readProgram()).status, "paused");
await call(programs, reception, "POST", { ...input, client: otherClient.id }, 400);
await action("resume");
assert.equal((await readProgram()).status, "active");
await call(`${records("memberships")}/${membership.id}`, root, "PATCH", { status: "expired" });
assert.equal((await readProgram()).status, "active");
await action("cancel", { note: "Solicitud del cliente" });
assert.equal((await readProgram()).status, "ended");

const audit = async (collection: string, id: string) => {
  const result = await call<{ items: { action: string; actor: string; diff: Record<string, { from?: string; to?: string }> }[] }>(
    records("audit_logs") + filter(`collection = '${collection}' && record_id = '${id}'`), owner,
  );
  return result.items;
};
const programAudit = await audit("coaching_programs", program.id);
assert(programAudit.some(({ action }) => action === "create"));
assert(programAudit.filter(({ action }) => action === "update").length >= 4);
assert(programAudit.some(({ diff }) => diff.renews_on?.from?.slice(0, 10) === program.renews_on.slice(0, 10)
  && diff.renews_on.to?.slice(0, 10) === addDays(program.renews_on.slice(0, 10), 28)));
assert((await audit("coaching_checkins", saved.id)).some(({ action, actor }) => action === "create" && actor === ownerRecord.id));
console.log("Coaching verificado: membresía online, unicidad, permisos, validaciones, renovación, pausa, reanudación, cancelación y auditoría.");
