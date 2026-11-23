import assert from "node:assert/strict";
import { Database } from "bun:sqlite";

const [base] = process.argv.slice(2);
const password = process.env.JQ_VERIFY_PASSWORD;
assert(base && password, "Ejecuta scripts/verify-api.sh");

async function call<T = Record<string, unknown>>(
  path: string,
  token = "",
  method = "GET",
  body?: Record<string, unknown>,
  expected: number | number[] = 200,
): Promise<T> {
  const response = await fetch(`${base}/api/${path}`, {
    method,
    headers: { Authorization: token, "Content-Type": "application/json" },
    body: body && JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  const data = response.status === 204 ? null : await response.json();
  assert((Array.isArray(expected) ? expected : [expected]).includes(response.status), `${method} ${path}: ${JSON.stringify(data)}`);
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

const invalid = await call<{ data: { body?: { message: string } } }>(
  `${templates}/${id}`, owner, "PATCH", { body: "{{password}}" }, 400,
);
assert.match(invalid.data.body?.message ?? "", /password/);
await call(`${templates}/${id}`, owner, "PATCH", { body: "Prueba de auditoría" });
const audit = "collections/audit_logs/records?" + new URLSearchParams({
  filter: `collection = "message_templates" && record_id = "${id}" && action = "update"`,
});
assert.equal((await call<{ items: unknown[] }>(audit, owner)).items.length, 1);
await call(`${templates}/${id}`, owner, "PATCH", { body });

type Row = { id: string };
type Booking = Row & { status: string };
type Log = Row & { client: string; dedupe_key: string; template_key: string; status: string; next_retry_at: string };
const sessions = "collections/class_sessions/records";
const bookings = "collections/bookings/records";
const { items: services } = await call<{ items: Row[] }>("collections/services/records", owner);
const start = Date.now() + 12 * 3_600_000;

const createSession = (extraHours: number, capacity: number) => call<Row>(sessions, owner, "POST", {
  service: services[0]!.id, starts_at: new Date(start + extraHours * 3_600_000).toISOString(), capacity, duration_min: 60,
});
const createClient = (n: number) => call<Row>(clients, owner, "POST", {
  first_name: "Prueba", last_name: `Correo ${n}`, email: `messages-${n}@example.test`, status: "active",
});
const reserve = (session: Row, customer: Row) => call<Booking>(bookings, owner, "POST", {
  session: session.id, client: customer.id, override_note: "Prueba temporal de comunicaciones",
});
const sessionLogs = async ({ id }: Row, key: string) => (await call<{ items: Log[] }>(
  logs + "?" + new URLSearchParams({ filter: `session = "${id}" && template_key = "${key}"` }), owner,
)).items;

const recipients = await Promise.all(Array.from({ length: 5 }, (_, n) => createClient(n)));
const target = await createSession(0, 4);
const reservations = [];
for (const recipient of recipients) reservations.push(await reserve(target, recipient));
assert.deepEqual(reservations.map(({ status }) => status), ["booked", "booked", "booked", "booked", "waitlisted"]);
const confirmed = await sessionLogs(target, "booking_confirmed");
assert.equal(confirmed.length, 4);
assert(confirmed.every(({ status, next_retry_at }) => status === "failed" && next_retry_at));

const wait = async (check: () => Promise<boolean>) => {
  for (let attempt = 0; attempt < 50; attempt++) {
    if (await check()) return;
    await Bun.sleep(50);
  }
  assert.fail("El trabajo de comunicaciones no terminó");
};
await call("crons/class_reminders", root, "POST", undefined, 204);
await wait(async () => (await sessionLogs(target, "class_reminder")).length === 4);
await call("crons/class_reminders", root, "POST", undefined, 204);
await call(`${sessions}/${target.id}`, owner, "PATCH", { starts_at: new Date(start + 3_600_000).toISOString() });
assert.equal((await sessionLogs(target, "class_cancelled")).length, 5);
await call(`${sessions}/${target.id}`, owner, "PATCH", { status: "cancelled", cancel_reason: "Cambio de agenda" });
const cancellations = (await sessionLogs(target, "class_cancelled")).filter(({ dedupe_key }) => !dedupe_key.includes(":change:"));
assert.equal(cancellations.length, 5);
assert.equal(new Set(cancellations.map(({ client }) => client)).size, 5);
const repeated = await fetch(`${base}/api/${sessions}/${target.id}`, {
  method: "PATCH", headers: { Authorization: owner, "Content-Type": "application/json" },
  body: JSON.stringify({ status: "cancelled", cancel_reason: "Cambio de agenda" }),
});
assert([200, 400].includes(repeated.status));
assert.equal((await sessionLogs(target, "class_cancelled")).length, 10);
assert.equal((await sessionLogs(target, "class_reminder")).length, 4);

const promotion = await createSession(2, 1);
const booked = await reserve(promotion, recipients[0]!);
const waiting = await reserve(promotion, recipients[1]!);
assert.equal(waiting.status, "waitlisted");
await call(`${bookings}/${booked.id}`, owner, "PATCH", { status: "cancelled", override_note: "Prueba de promoción" });
assert.deepEqual((await sessionLogs(promotion, "waitlist_promoted")).map(({ client }) => client), [recipients[1]!.id]);
assert.equal((await sessionLogs(promotion, "booking_confirmed")).length, 1);
console.log("Confirmación, recordatorio, lista de espera, cambios y cancelación verificados.");

const preview = "admin/messages/preview";
const testMail = "admin/messages/test";
const manual = (session: Row) => `admin/messages/class/${session.id}`;
const draft = { key: "manual", locale: "es", subject: "Aviso", body: "<b>{{client_first_name}}</b>" };
const compiled = await call<{ html: string; unknown_variables: string[] }>(preview, coach, "POST", draft);
assert.equal(compiled.html, "<p>&lt;b&gt;Ana&lt;/b&gt;</p>");
assert.deepEqual(compiled.unknown_variables, []);
const unknown = await call<{ unknown_variables: string[] }>(preview, coach, "POST", { ...draft, body: "{{password}}" }, 400);
assert.deepEqual(unknown.unknown_variables, ["password"]);
for (const path of [preview, testMail, manual(promotion)]) await call(path, "", "POST", draft, [401, 403]);
for (const token of [coach, reception]) await call(testMail, token, "POST", { key, locale }, 403);
assert.equal((await call(testMail, owner, "POST", { key, locale }, 400)).message, "El correo no está configurado.");

const manualTarget = await createSession(4, 1);
await reserve(manualTarget, recipients[2]!);
await reserve(manualTarget, recipients[3]!);
await call(`${clients}/${recipients[3]!.id}`, owner, "PATCH", { status: "inactive" });
await call(manual({ id: "missing00000000" }), owner, "POST", draft, 404);
await call(manual(target), owner, "POST", draft, 400);
await call(manual(manualTarget), owner, "POST", { ...draft, body: "  " }, 400);
assert.deepEqual(await call(manual(manualTarget), reception, "POST", draft), { sent: 0, failed: 1, skipped: 1 });
assert.deepEqual((await sessionLogs(manualTarget, "manual")).map(({ client }) => client), [recipients[2]!.id]);

const dbPath = process.env.JQ_VERIFY_DB;
if (dbPath) {
  const bulk = await createSession(5, 200);
  using db = new Database(dbPath);
  db.transaction(() => {
    for (let i = 0; i < 201; i++) {
      const suffix = String(i).padStart(4, "0");
      const client = `msgbulkclnt${suffix}`;
      db.query("INSERT INTO clients (id, first_name, last_name, status) VALUES (?, 'Bulk', 'Test', 'active')").run(client);
      db.query("INSERT INTO bookings (id, session, client, status, source) VALUES (?, ?, ?, 'booked', 'admin')")
        .run(`msgbulkbook${suffix}`, bulk.id, client);
    }
  })();
  await call(manual(bulk), owner, "POST", draft, 400);
  assert.equal((await sessionLogs(bulk, "manual")).length, 0);
}
console.log("Vista previa, permisos, límites y mensaje manual verificados.");
