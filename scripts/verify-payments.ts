import assert from "node:assert/strict";
import { Database } from "bun:sqlite";
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
  const data = response.status === 204 ? null : await response.json();
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

const { token: reception, record: cashier } = await auth("admins", "reception@catalog-verify.example.test");
const path = "admin/payments";
const today = utcToLocal(new Date().toISOString()).date;
const paidBody = { client: client.id, amount_cents: 9876, status: "paid", method: "cash", paid_at: today };
type Payment = Row & {
  receipt_number: string; status: string; void_reason: string; voided_at: string; voided_by: string;
};
const create = (body: Body, expected = 200, token = reception) => call<Payment>(path, token, "POST", body, expected);
const action = (record: Row, op: "pay" | "void", body: Body, expected = 200) =>
  call<Payment>(`${path}/${record.id}/${op}`, reception, "POST", body, expected);
const makePending = () => create({ client: client.id, amount_cents: 9876, status: "pending", due_on: today });
const receipt = (seq: number) => `JQ-${today.slice(0, 4)}-${String(seq).padStart(6, "0")}`;

await create(paidBody, 403, coach);
await create({ ...paidBody, amount_cents: 0 }, 400);
await create({ ...paidBody, method: "bad" }, 400);
await create({ ...paidBody, paid_at: "9999-01-01" }, 400);
await create({ ...paidBody, status: "pending" }, 400);
const first = await create(paidBody);
assert.equal(first.receipt_number, receipt(1));
const [a, b] = await Promise.all([makePending(), makePending()]);
assert.equal(a.receipt_number, "");
assert.equal(b.receipt_number, "");

const database = process.env.JQ_VERIFY_DB;
assert(database);
const db = new Database(database);
db.run(`CREATE TRIGGER verify_payment_rollback BEFORE UPDATE ON payments
  WHEN NEW.id = '${a.id}' AND NEW.status = 'paid'
  BEGIN SELECT RAISE(ABORT, 'verify_payment_rollback'); END`);
try {
  await action(a, "pay", { method: "zelle" }, 400);
  assert.equal((await call<Payment>(`${payments}/${a.id}`, owner)).status, "pending");
  assert.deepEqual(db.query("SELECT last_seq FROM receipt_sequences WHERE year = ?").get(Number(today.slice(0, 4))), { last_seq: 1 });
} finally {
  db.run("DROP TRIGGER verify_payment_rollback");
  db.close();
}
const settled = await Promise.all([action(a, "pay", { method: "zelle" }), action(b, "pay", { method: "card" })]);
assert.deepEqual(settled.map(p => p.receipt_number).sort(), [receipt(2), receipt(3)]);
await action(a, "pay", { method: "card" }, 409);
await action(first, "void", { reason: "  " }, 400);
const voided = await action(first, "void", { reason: "Duplicado" });
assert.equal(voided.status, "void");
assert.equal(voided.void_reason, "Duplicado");
assert(voided.voided_at);
assert.equal(voided.voided_by, cashier.id);
assert.equal(voided.receipt_number, receipt(1));
await action(first, "void", { reason: "Duplicado" }, 409);
await action(first, "pay", { method: "card" }, 409);
await call(`${payments}/${first.id}`, owner, "DELETE", undefined, 403);
const query = new URLSearchParams({ filter: `record_id = '${first.id}' && action = 'custom'` });
const { items: logs } = await call<{ items: { summary: string; actor: string }[] }>(records("audit_logs") + "?" + query, owner);
assert.deepEqual(logs.map(log => [log.summary, log.actor]).sort(), [["Pago anulado", cashier.id], ["Pago registrado", cashier.id]]);
console.log("Registro, concurrencia, rollback del contador, permisos y anulación auditada verificados.");
