import assert from "node:assert/strict";
import { Database } from "bun:sqlite";
import { addDays, nextPeriod, periodBounds } from "../api/src/lib/membership-cycles";
import { utcToLocal } from "../api/src/lib/tz";

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
const filter = (expression: string) => "?" + new URLSearchParams({ filter: expression });
async function auth(collection: string, identity: string) {
  const { token } = await call<{ token: string }>(`collections/${collection}/auth-with-password`, "", "POST", { identity, password });
  return token;
}

const root = await auth("_superusers", "catalog-verify@example.test");
const owner = await auth("admins", "owner@catalog-verify.example.test");
const today = utcToLocal(new Date().toISOString()).date;
const { items: plans } = await call<{ items: Row[] }>(records("plans"), owner);
assert(plans.length);
const client = await call<Row>(records("clients"), owner, "POST", {
  first_name: "Membresías", last_name: "Migración", status: "active",
});
const memberships = records("memberships");
const seed = {
  client: client.id, plan: plans[0].id, status: "active",
  starts_on: today, current_period_start: today, current_period_end: today,
};
await call(memberships, owner, "POST", seed, 403);
await call(records("credit_movements"), owner, "POST", {}, 403);
await call(memberships, root, "POST", seed);
await call(memberships, root, "POST", seed, 400);
const { items: matching } = await call<{ items: Row[] }>(
  records("clients") + filter(`id = '${client.id}' && memberships_via_client.status ?= 'active'`), owner,
);
assert.deepEqual(matching.map(({ id }) => id), [client.id]);
console.log("Reglas de escritura, índice único y back-relation de membresías verificados.");

type Membership = Row & {
  current_period_start: string; current_period_end: string; status: string; ended_on: string;
  credits_balance: number; periods_paid: number; notes: string;
};
type Movement = Row & { delta: number; reason: string; note: string };
type Result = { membership: Membership; movement: Movement | null };
const reception = await auth("admins", "reception@catalog-verify.example.test");
const coach = await auth("admins", "coach@catalog-verify.example.test");
const route = "admin/memberships";
const { items: [pack] } = await call<{ items: (Row & { sessions: number; service: string })[] }>(
  records("plans") + filter("billing_unit = 'per_4_weeks' && sessions > 0 && commitment_periods > 0 && active = true"), owner,
);
assert(pack);
const member = await call<Row>(records("clients"), owner, "POST", {
  first_name: "Membresías", last_name: "Gestión", status: "active",
});
const assignBody = { client: member.id, plan: pack.id, starts_on: today };
await call(route + "/assign", coach, "POST", assignBody, 403);
const assigned = await call<Result>(route + "/assign", reception, "POST", assignBody);
const id = assigned.membership.id;
const bounds = periodBounds(today, 1);
assert.equal(assigned.membership.current_period_start.slice(0, 10), bounds.start);
assert.equal(assigned.membership.current_period_end.slice(0, 10), bounds.end);
assert.equal(assigned.membership.credits_balance, pack.sessions);
assert.equal(assigned.movement?.delta, pack.sessions);
assert.equal(assigned.movement?.reason, "grant");
await call(route + "/assign", reception, "POST", assignBody, 409);

function action(name: string, body: Body = {}, expected = 200, token = reception, membershipId = id) {
  return call<Result>(`${route}/${membershipId}/${name}`, token, "POST", body, expected);
}
const ledger = (membershipId = id) => call<{ items: Movement[] }>(
  records("credit_movements") + filter(`membership = '${membershipId}'`), owner,
).then(({ items }) => items);
for (const name of ["renew", "pause", "resume", "cancel", "adjust"]) await action(name, {}, 403, coach);
await action("adjust", { delta: -2 }, 400);
const adjusted = await action("adjust", { delta: -2, note: "Corrección" });
assert.equal(adjusted.membership.credits_balance, (await ledger()).reduce((sum, { delta }) => sum + delta, 0));
assert.equal(adjusted.movement?.reason, "adjust");

const dbPath = process.env.JQ_VERIFY_DB;
assert(dbPath);
const db = new Database(dbPath);
db.exec(`CREATE TRIGGER verify_membership_rollback BEFORE UPDATE OF credits_balance ON memberships
  WHEN NEW.credits_balance = OLD.credits_balance + 17
  BEGIN SELECT RAISE(ABORT, 'verify rollback'); END`);
try {
  const before = await ledger();
  await action("adjust", { delta: 17, note: "Prueba de rollback" }, 400);
  assert.deepEqual(await ledger(), before);
  const persisted = await call<Membership>(`${memberships}/${id}`, owner);
  assert.equal(persisted.credits_balance, adjusted.membership.credits_balance);
} finally {
  db.exec("DROP TRIGGER verify_membership_rollback");
  db.close();
}

await action("pause", { note: "  " }, 400);
assert.equal((await action("pause", { note: "Viaje" })).membership.status, "paused");
assert.equal((await action("resume")).membership.status, "active");
const renewed = await action("renew");
assert.equal(renewed.membership.current_period_start.slice(0, 10), nextPeriod(bounds.end).start);
assert.equal(renewed.membership.current_period_end.slice(0, 10), nextPeriod(bounds.end).end);
assert.equal(renewed.membership.periods_paid, 2);
assert.equal(renewed.membership.credits_balance, pack.sessions);
await action("cancel", {}, 400);
const cancelled = await action("cancel", { note: "Solicitud del cliente" });
assert.equal(cancelled.membership.status, "cancelled");
assert.equal(cancelled.membership.ended_on.slice(0, 10), today);
assert.equal(cancelled.membership.credits_balance, 0);
assert.match(cancelled.membership.notes, /anticipada/);
await action("renew", {}, 409);

const expired = await call<Membership>(memberships, root, "POST", {
  ...assignBody, status: "expired", starts_on: addDays(today, -40),
  current_period_start: addDays(today, -40), current_period_end: addDays(today, -13), ended_on: addDays(today, -5),
});
const reactivated = await action("renew", {}, 200, owner, expired.id);
assert.equal(reactivated.membership.ended_on, "");
assert.equal(reactivated.membership.current_period_start.slice(0, 10), today);
const { items: audit } = await call<{ items: { summary: string }[] }>(
  records("audit_logs") + filter(`collection = 'memberships' && record_id = '${id}' && action = 'custom'`), owner,
);
assert.deepEqual(audit.map(({ summary }) => summary).sort(), [
  "Cancelación anticipada de membresía", "Créditos ajustados", "Membresía pausada",
  "Membresía reanudada", "Membresía renovada", "Plan asignado",
].sort());
console.log("Gestión de membresías, auditoría y rollback verificados.");
