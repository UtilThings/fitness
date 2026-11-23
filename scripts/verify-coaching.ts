import assert from "node:assert/strict";
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
  return call<{ token: string; record: Row }>(`collections/${collection}/auth-with-password`, "", "POST", { identity, password });
}

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
const { membership } = await call<{ membership: Membership; movement: unknown }>(
  "admin/memberships/assign", reception, "POST", { client: client.id, plan: plan.id, starts_on: today },
);
const programs = records("coaching_programs");
const checkins = records("coaching_checkins");
const input = {
  client: client.id, coach: ownerRecord.id, membership: membership.id,
  status: "active", starts_on: today, duration_weeks: 12,
};
const ended = await call<Row>(programs, reception, "POST", input);
await call(programs, owner, "POST", input, 400);
await call(`${programs}/${ended.id}`, owner, "PATCH", { status: "ended" });
const program = await call<Row>(programs, reception, "POST", input);
const checkin = { program: program.id, checked_at: today, adherence: 4 };
for (const adherence of [0, 6]) {
  await call(checkins, owner, "POST", { ...checkin, adherence }, 400);
}
await call(checkins, coach, "POST", checkin, 400);
await call(checkins, reception, "POST", checkin, 400);
await call(checkins, owner, "POST", checkin);
await call<{ items: Row[] }>(checkins + filter(`program = '${program.id}'`), reception)
  .then(({ items }) => assert.equal(items.length, 1));

const coached = await call<Row>(programs, coach, "POST", { ...input, status: "ended", coach: coachRecord.id });
assert(coached.id);
console.log("Migraciones, unicidad y permisos de coaching verificados.");
