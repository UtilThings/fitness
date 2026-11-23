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
