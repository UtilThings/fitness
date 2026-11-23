import assert from "node:assert/strict";

const [base] = process.argv.slice(2);
const password = process.env.JQ_VERIFY_PASSWORD;
assert(base && password, "Ejecuta scripts/verify-api.sh");

async function call<T = Record<string, unknown>>(
  path: string,
  token = "",
  method = "GET",
  body?: Record<string, unknown>,
  expected = 200,
): Promise<T> {
  const response = await fetch(`${base}/api/${path}`, {
    method,
    headers: { Authorization: token, "Content-Type": "application/json" },
    body: body && JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  const data = response.status === 204 ? null : await response.json();
  assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(data)}`);
  return data as T;
}

async function auth(email: string, collection = "admins") {
  const data = await call<{ token: string }>(`collections/${collection}/auth-with-password`, "", "POST", {
    identity: email, password,
  });
  return data.token;
}

const templates = "collections/message_templates/records";
const logs = "collections/message_logs/records";
const owner = await auth("owner@catalog-verify.example.test");
const coach = await auth("coach@catalog-verify.example.test");
const reception = await auth("reception@catalog-verify.example.test");
const root = await auth("catalog-verify@example.test", "_superusers");
type Template = { id: string; key: string; locale: string; active: boolean; subject: string; body: string };
const { items } = await call<{ items: Template[] }>(templates, owner);
assert.equal(items.length, 12);
assert(items.every((item) => item.active));
assert.equal(new Set(items.map(({ key, locale }) => `${key}:${locale}`)).size, 12);
const { id, key, locale, subject, body } = items[0]!;
for (const token of ["", coach, reception]) {
  await call(templates, token, "POST", { key, locale, subject, body }, 400);
  await call(`${templates}/${id}`, token, "PATCH", { subject }, 404);
}
for (const token of ["", owner, coach, reception]) {
  await call(logs, token, "POST", {}, 403);
  await call(`${logs}/sample000000001`, token, "PATCH", {}, 403);
  await call(`${logs}/sample000000001`, token, "DELETE", undefined, 403);
}
await call(templates, owner, "POST", { key, locale, subject, body }, 400);
const clients = "collections/clients/records";
const client = await call<{ id: string; locale: string }>(clients, owner, "POST", {
  first_name: "Prueba", last_name: "Mensajes", status: "active",
});
assert.equal(client.locale, "es");
const log = {
  client: client.id,
  template_key: key,
  channel: "email",
  status: "sent",
  attempts: 1,
  dedupe_key: "verify-message-dedupe",
};
const saved = await call<{ id: string }>(logs, root, "POST", log);
await call(logs, root, "POST", log, 400);
await call(`${logs}/${saved.id}`, root, "DELETE", undefined, 204);
await call(`${clients}/${client.id}`, owner, "DELETE", undefined, 204);
