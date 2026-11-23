import assert from "node:assert/strict";

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
function auth(collection: string, identity: string) {
  return call<{ token: string; record: Row }>(`collections/${collection}/auth-with-password`, "", "POST", { identity, password });
}

const { token: root } = await auth("_superusers", "catalog-verify@example.test");
const { token: owner, record: admin } = await auth("admins", "owner@catalog-verify.example.test");
const { token: coach } = await auth("admins", "coach@catalog-verify.example.test");
const client = await call<Row>(records("clients"), owner, "POST", {
  first_name: "Pagos", last_name: "Verificación", status: "active",
});
const { items: [plan] } = await call<{ items: Row[] }>(records("plans"), owner);
assert(plan);
const membership = await call<Row>(records("memberships"), root, "POST", {
  client: client.id, plan: plan.id, status: "active", starts_on: "2026-01-01",
  current_period_start: "2026-01-01", current_period_end: "2026-01-28",
});

const payments = records("payments");
const seed = { client: client.id, recorded_by: admin.id, amount_cents: 100, status: "pending" };
const insert = (body: Body, status = 200) => call<Row>(payments, root, "POST", { ...seed, ...body }, status);
await insert({});
await insert({});
await insert({ status: "paid", receipt_number: "JQ-2020-000001" });
await insert({ status: "paid", receipt_number: "JQ-2020-000001" }, 400);

const cycle = { membership: membership.id, period_index: 1 };
const pending = await insert(cycle);
await insert(cycle, 400);
await call(`${payments}/${pending.id}`, root, "PATCH", { status: "void" });
await insert(cycle);
assert.deepEqual((await call<{ items: Row[] }>(payments, coach)).items, []);
await call(payments, coach, "POST", seed, 403);
await call(payments, owner, "POST", seed, 403);
await call(records("receipt_sequences"), owner, "GET", undefined, 403);
console.log("Índices parciales y reglas de pagos verificados.");
