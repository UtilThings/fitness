import assert from "node:assert/strict";
import { Database } from "bun:sqlite";
import { TENANT_COLLECTIONS, TENANT_REFERENCES, type TenantCollection } from "../api/src/lib/tenant";
import { RULE_BUSINESS, RULE_BUSINESS_SELF } from "../api/src/lib/rules";
import { addLocalDays, utcToLocal } from "../api/src/lib/tz";

const [base, path] = process.argv.slice(2);
const password = process.env.JQ_VERIFY_PASSWORD;
assert(base && path && password, "Ejecuta scripts/verify-api.sh");

type RecordData = { id: string; business: string; [field: string]: unknown };
type Field = { name: string; type: string; collectionId?: string; required?: boolean; maxSelect?: number; cascadeDelete?: boolean; protected?: boolean };
type Action = "listRule" | "viewRule" | "createRule" | "updateRule" | "deleteRule";
type Collection = { id: string; name: string; system: boolean; fields: Field[]; indexes: string[] } & Record<Action, string | null>;
type Fixture = Awaited<ReturnType<typeof seed>>;
type Body = Record<string, unknown>;

const endpoint = (collection: string, id?: string) => `collections/${collection}/records${id ? "/" + id : ""}`;
const query = (params: Record<string, string>) => "?" + new URLSearchParams(params);
const db = new Database(path);
db.run("PRAGMA busy_timeout = 5000");

async function call<T = RecordData>(
  route: string, token = "", method = "GET", body?: Body, expected = 200,
): Promise<T> {
  const response = await fetch(`${base}/api/${route}`, {
    method,
    headers: { ...(token && { Authorization: token }), ...(body && { "Content-Type": "application/json" }) },
    body: body && JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  });
  const payload = response.status === 204 ? null : await response.json();
  assert.equal(response.status, expected, `${method} ${route}: ${JSON.stringify(payload)}`);
  return payload;
}

function list<T = RecordData>(route: string, token: string) {
  return call<{ items: T[] }>(route + (route.includes("?") ? "&" : "?") + "perPage=200", token).then(({ items }) => items);
}

function login(identity: string, name = "admins") {
  return call<{ token: string; record: RecordData }>(`collections/${name}/auth-with-password`, "", "POST", { identity, password });
}

function fixtureRow(table: TenantCollection, business: string, fields: Record<string, string | number | boolean>) {
  const id = crypto.randomUUID().replaceAll("-", "").slice(0, 15);
  const entries = Object.entries({ id, business, ...fields });
  db.query(`INSERT INTO ${table} (${entries.map(([key]) => `"${key}"`).join(", ")}) VALUES (${entries.map(() => "?").join(", ")})`)
    .run(...entries.map(([, value]) => value));
  return id;
}

const forever = "2097-01-01";
const future = new Date(Date.now() + 4 * 3_600_000).toISOString();
const root = (await login("catalog-verify@example.test", "_superusers")).token;

async function seed(label: "a" | "b", timezone: string, currency: string) {
  const name = "Tenant " + label.toUpperCase();
  const origin = `https://verify-${label}.example.test`;
  const receipt_prefix = `TEN${label.toUpperCase()}`;
  const settings = await call(endpoint("businesses"), root, "POST", {
    name, slug: "verify-tenant-" + label, active: true, timezone, currency, receipt_prefix, allowed_origins: [origin],
  });
  const email = `owner-${label}@verify-tenant.example.test`;
  const admin = await call(endpoint("admins"), root, "POST", {
    name, business: settings.id, email, role: "owner", active: true, password, passwordConfirm: password,
  });
  const { token } = await login(email);
  const data = db.transaction(() => {
    const add = (table: TenantCollection, fields: Parameters<typeof fixtureRow>[2]) => fixtureRow(table, settings.id, fields);
    const services = add("services", { slug: `tenant-${label}`, name, kind: "group", active: true, capacity: 6, default_coach: admin.id });
    const personal = add("services", { slug: `personal-${label}`, name: name + " personal", kind: "personal", active: true, capacity: 1 });
    const online = add("services", { slug: `online-${label}`, name: name + " online", kind: "online", active: true });
    const plans = add("plans", { service: services, name: "Pack", price_cents: 1000, billing_unit: "per_4_weeks", sessions: 8, active: true });
    const onlinePlan = add("plans", { service: online, name: "Online", price_cents: 2000, billing_unit: "per_4_weeks", sessions: 1, active: true });
    const class_templates = add("class_templates", { service: services, weekday: 1, start_time: "09:00", duration_min: 60, capacity: 6, coach: admin.id, active: true });
    const class_sessions = add("class_sessions", { service: services, starts_at: future.replace("T", " "), status: "scheduled",
      kind: "regular", duration_min: 60, capacity: 6, coach: admin.id });
    const schedule_blocks = add("schedule_blocks", { title: "Later", date_from: forever, date_to: forever });
    const coach_availability = add("coach_availability", { coach: admin.id, weekday: 1, start_time: "09:00", end_time: "10:00" });
    const clients = add("clients", { first_name: name, last_name: "Client", email: "same@example.test", status: "active", locale: "es" });
    const alternateClient = add("clients", { first_name: name, last_name: "Other", email: label + "2@example.test", status: "active", locale: "es" });
    const coachingClient = add("clients", { first_name: name, last_name: "Online", status: "active", locale: "es" });
    const membershipFields = { status: "active", starts_on: "2020-01-01", current_period_start: "2020-01-01", current_period_end: "2020-01-28", periods_paid: 1, credits_balance: 1 };
    const memberships = add("memberships", { ...membershipFields, client: clients, plan: plans });
    const onlineMembership = add("memberships", { ...membershipFields, current_period_end: forever, client: clients, plan: onlinePlan });
    const alternateOnline = add("memberships", { ...membershipFields, current_period_end: forever, client: coachingClient, plan: onlinePlan });
    const bookings = add("bookings", { session: class_sessions, client: clients, status: "booked", source: "admin", membership: memberships });
    const credit_movements = add("credit_movements", { membership: memberships, booking: bookings, delta: 1, reason: "grant", created_by: admin.id });
    const receipt_sequences = add("receipt_sequences", { year: 2020, last_seq: 1 });
    const today = utcToLocal(new Date().toISOString(), timezone).date;
    const payments = add("payments", { client: clients, membership: memberships, plan: plans, amount_cents: label === "a" ? 1000 : 2000,
      status: "pending", due_on: today, currency, recorded_by: admin.id });
    const coaching_programs = add("coaching_programs", { client: clients, membership: onlineMembership, coach: admin.id, status: "active", starts_on: "2020-01-01", duration_weeks: 8 });
    const coaching_checkins = add("coaching_checkins", { program: coaching_programs, checked_at: "2020-01-02", adherence: 4, created_by: admin.id });
    const message_logs = add("message_logs", { client: clients, session: class_sessions, template_key: "booking_confirmed", channel: "email", status: "sent", attempts: 1 });
    const audit_logs = add("audit_logs", { actor: admin.id, action: "custom", collection: "clients", record_id: clients, summary: name });
    return {
      today, alternateClient, alternateOnline, coachingClient, personal,
      rows: { admins: admin.id, services, plans, class_templates, class_sessions, schedule_blocks, coach_availability,
        clients, bookings, memberships, credit_movements, receipt_sequences, payments, coaching_programs, coaching_checkins, message_logs, audit_logs },
    };
  })();
  const template = (await list(endpoint("message_templates"), token)).find(({ key, locale }) => key === "membership_renewal" && locale === "en");
  assert(template);
  return { ...data, rows: { ...data.rows, message_templates: template.id }, id: settings.id, token, name, origin, timezone, currency, receipt_prefix };
}

const lockedWrites = new Set(["audit_logs", "memberships", "credit_movements", "receipt_sequences", "payments", "message_logs"]);
const readRules = ["listRule", "viewRule"] as const;

function expectSchema(collections: Collection[]) {
  const supported = collections.filter(({ system, name }) => !system && name !== "users" && name !== "businesses");
  assert.deepEqual(supported.map(({ name }) => name).sort(), [...TENANT_COLLECTIONS].sort());
  const businesses = collections.find(({ name }) => name === "businesses");
  assert(businesses);
  for (const action of [...readRules, "updateRule"] as const) {
    assert(businesses[action]?.includes(RULE_BUSINESS_SELF), `businesses.${action} carece de su regla`);
  }
  assert.equal(businesses.createRule, null);
  assert.equal(businesses.deleteRule, null);
  for (const collection of supported) {
    const name = collection.name as TenantCollection;
    const business = collection.fields.find((field) => field.name === "business");
    assert(business?.required && business.maxSelect === 1 && !business.cascadeDelete && business.collectionId === businesses.id, name);
    if (name === "admins") assert(collection.fields.find((field) => field.name === "avatar")?.protected);
    assert(collection.indexes.some((index) => /\(\x60?business\x60?\)/.test(index)), `${name} sin índice de business`);
    const fields = Object.fromEntries(collection.fields
      .filter((field) => field.type === "relation" && field.name !== "business")
      .map((field) => [field.name, collections.find(({ id }) => id === field.collectionId)?.name]));
    assert.deepEqual(fields, TENANT_REFERENCES[name] ?? {}, `${name} tiene relaciones sin validar`);
    for (const action of [...readRules, "updateRule", "deleteRule"] as const) {
      const denied = name === "receipt_sequences" || (lockedWrites.has(name) && !readRules.includes(action as typeof readRules[number]))
        || (name === "class_sessions" && action === "deleteRule");
      if (denied) assert.equal(collection[action], null, `${name}.${action} debe permanecer cerrada`);
      else assert(collection[action]?.includes(RULE_BUSINESS), `${name}.${action} carece de regla de negocio`);
    }
    assert.equal(collection.createRule === null, lockedWrites.has(name), `${name}.createRule`);
    assert.equal(db.query<{ count: number }, []>(`SELECT count(*) AS count FROM ${name} WHERE business = '' OR business IS NULL`).get()!.count, 0, name);
  }
}

function sharedOptions(fixture: Fixture): Record<Exclude<TenantCollection, "audit_logs" | "memberships" | "credit_movements" | "receipt_sequences" | "payments" | "message_logs">, Body> {
  const { rows } = fixture;
  return {
    admins: { email: `coach-${fixture.id}@example.test`, password, passwordConfirm: password, name: "New coach", role: "coach" },
    services: { name: "Shared service", slug: "shared-service", kind: "group", capacity: 6 },
    plans: { service: rows.services, name: "Second pack", price_cents: 2000, billing_unit: "per_4_weeks", sessions: 8 },
    class_templates: { service: rows.services, weekday: 2, start_time: "09:00", duration_min: 60, capacity: 6, active: false },
    class_sessions: { service: rows.services, starts_at: future, kind: "special", status: "scheduled", title: "Event", duration_min: 60, capacity: 6 },
    schedule_blocks: { title: "Later duplicate dates", date_from: forever, date_to: forever },
    coach_availability: { coach: rows.admins, weekday: 2, start_time: "08:00", end_time: "10:00" },
    clients: { first_name: "New", last_name: "Client", email: "new-shared@example.test", status: "active" },
    bookings: { session: rows.class_sessions, client: fixture.alternateClient, override_note: "Fixture" },
    coaching_programs: { client: fixture.coachingClient, membership: fixture.alternateOnline, coach: rows.admins, status: "active", starts_on: "2020-01-01", duration_weeks: 8 },
    coaching_checkins: { program: rows.coaching_programs, checked_at: "2020-01-03", adherence: 3 },
    message_templates: { key: "membership_renewal", locale: "en", subject: "Next", body: "{{studio_name}}" },
  };
}

async function collectionIsolation(a: Fixture, b: Fixture, collections: Collection[]) {
  for (const name of TENANT_COLLECTIONS) {
    const schema = collections.find((entry) => entry.name === name)!;
    const foreign = endpoint(name, b.rows[name]);
    const own = endpoint(name, a.rows[name]);
    if (schema.listRule === null) await call(endpoint(name), a.token, "GET", undefined, 403);
    else {
      const rows = await list(endpoint(name), a.token);
      assert(rows.some(({ id }) => id === a.rows[name]) && rows.every(({ business }) => business === a.id), name);
    }
    for (const [method, action] of [["GET", "viewRule"], ["PATCH", "updateRule"], ["DELETE", "deleteRule"]] as const) {
      await call(foreign, a.token, method, method === "PATCH" ? { business: a.id } : undefined, schema[action] === null ? 403 : 404);
    }
    await call(own, a.token, "PATCH", { business: b.id }, schema.updateRule === null ? 403 : 400);
    if (schema.createRule === null) await call(endpoint(name), a.token, "POST", { business: b.id }, 403);
  }
  for (const name of ["businesses"] as const) {
    const rows = await list(endpoint(name), a.token);
    assert.deepEqual(rows.map(({ id }) => id), [a.id]);
    await call(endpoint(name, b.id), a.token, "GET", undefined, 404);
    await call(endpoint(name, b.id), a.token, "PATCH", { name: "Other" }, 404);
    await call(endpoint(name, b.id), a.token, "DELETE", undefined, 403);
    await call(endpoint(name), a.token, "POST", {}, 403);
    await call(endpoint(name, b.id), root, "DELETE", undefined, 400);
  }

  for (const pair of [[a, b], [b, a]] as const) {
    const [own, foreign] = pair;
    for (const [name, payload] of Object.entries(sharedOptions(own))) {
      // Defaults already populate all key/locale combinations.
      if (name === "message_templates") await call(endpoint(name, own.rows[name]), own.token, "DELETE", undefined, 204);
      const created = await call(endpoint(name), own.token, "POST", { ...payload, business: foreign.id });
      assert.equal(created.business, own.id, name);
      if (name === "services" || name === "clients" || name === "message_templates") {
        await call(endpoint(name), own.token, "POST", payload, 400);
      }
    }
  }

  for (const [name, references] of Object.entries(TENANT_REFERENCES)) {
    if (lockedWrites.has(name)) continue;
    for (const [field, target] of Object.entries(references)) {
      await call(endpoint(name, a.rows[name as TenantCollection]), a.token, "PATCH", { [field]: b.rows[target] }, 400);
    }
  }
}

async function avatarIsolation(a: Fixture, b: Fixture) {
  const image = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7ioAAAAASUVORK5CYII=", "base64");
  const data = new FormData();
  data.set("avatar", new File([image], "avatar.png", { type: "image/png" }));
  const uploaded = await fetch(`${base}/api/${endpoint("admins", b.rows.admins)}`, {
    method: "PATCH", headers: { Authorization: b.token }, body: data,
  });
  assert.equal(uploaded.status, 200);
  const member = await uploaded.json();
  const url = `${base}/api/files/${member.collectionId}/${member.id}/${member.avatar}`;
  assert.equal((await fetch(url)).status, 404);
  let authorizedUrl = "";
  for (const fixture of [a, b]) {
    const { token } = await call<{ token: string }>("files/token", fixture.token, "POST");
    const response = await fetch(url + query({ token }));
    assert.equal(response.status, fixture === a ? 404 : 200);
    if (fixture === b) {
      authorizedUrl = url + query({ token });
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), image);
    }
  }
  return authorizedUrl;
}

async function adminIsolation(a: Fixture, b: Fixture) {
  const { token, rows } = a;
  const theirs = b.rows;
  const dashboard = await call<{ counts: { active_clients: number }; timezone: string }>("admin/dashboard", token);
  assert.equal(dashboard.timezone, a.timezone);
  assert.equal(dashboard.counts.active_clients,
    db.query<{ count: number }, [string]>("SELECT count(*) AS count FROM clients WHERE business = ? AND status = 'active'").get(a.id)!.count);
  assert(!JSON.stringify(dashboard).includes(theirs.class_sessions));
  const day = utcToLocal(future, a.timezone).date;
  const dates = { from: day, to: day };
  for (const kind of ["occupancy", "attendance", "revenue", "retention"]) {
    const response = await call<{ range: { timezone: string }; currency: string }>("admin/reports/" + kind + query(dates), token);
    assert.equal(response.range.timezone, a.timezone);
    assert.equal(response.currency, a.currency);
    assert(!JSON.stringify(response).includes(b.name));
  }
  await call("admin/reports/occupancy" + query({ ...dates, service: "tenant-b" }), token, "GET", undefined, 400);
  await call(`admin/sessions/${theirs.class_sessions}/availability`, token, "GET", undefined, 404);
  const availability = await call<{ session: string }[]>("admin/sessions/availability" + query({ from: day, to: addLocalDays(day, 1) }), token);
  assert(availability.some(({ session }) => session === rows.class_sessions));
  assert(availability.every(({ session }) => session !== theirs.class_sessions));
  for (const action of ["cancel", "move"]) {
    await call(`admin/sessions/${theirs.class_sessions}/${action}`, token, "POST", { reason: "Tenant verify", starts_at: future }, 404);
  }
  await call(`admin/class-templates/${theirs.class_templates}/assign-coach`, token, "POST", { coach: rows.admins }, 404);
  await call(`admin/class-templates/${rows.class_templates}/assign-coach`, token, "POST", { coach: theirs.admins }, 400);
  await call("admin/sessions/private", token, "POST", { coach: rows.admins, service: b.personal, starts_at: future, duration_min: 30, client_ids: [rows.clients] }, 400);
  const generated = await call<{ created: number }>("admin/sessions/generate", token, "POST", { from: a.today, weeks: 1 });
  assert(generated.created > 0);
  assert.equal(db.query("SELECT id FROM class_sessions WHERE template = ?").get(theirs.class_templates), null);
  await call("catalog/services/order", token, "PATCH", { updates: [{ id: theirs.services, sort: 1, previous: 0 }] }, 409);

  await call("admin/memberships/assign", token, "POST", { client: rows.clients, plan: theirs.plans }, 404);
  await call("admin/memberships/eligibility" + query({ client: theirs.clients, session: rows.class_sessions }), token, "GET", undefined, 404);
  for (const action of ["renew", "pause", "resume", "cancel", "adjust"]) {
    await call(`admin/memberships/${theirs.memberships}/${action}`, token, "POST", {}, 404);
  }
  await call("admin/payments", token, "POST",
    { client: rows.clients, membership: theirs.memberships, status: "pending", due_on: a.today, amount_cents: 500 }, 400);
  for (const action of ["pay", "void"]) {
    await call(`admin/payments/${theirs.payments}/${action}`, token, "POST", { method: "cash", reason: "Tenant verify" }, 404);
  }
  const due = await call<{ currency: string }>("admin/payments/due", token);
  assert.equal(due.currency, a.currency);
  assert(!JSON.stringify(due).includes(theirs.clients));
  for (const fixture of [a, b]) {
    const payment = await call("admin/payments", fixture.token, "POST", { client: fixture.rows.clients, amount_cents: 4000, status: "paid", method: "cash" });
    assert.equal(payment.currency, fixture.currency);
    assert.equal(payment.receipt_number, `${fixture.receipt_prefix}-${fixture.today.slice(0, 4)}-000001`);
  }

  const preview = await call<{ subject: string }>("admin/messages/preview", token, "POST",
    { key: "booking_confirmed", subject: "{{studio_name}}", body: "Preview" });
  assert.equal(preview.subject, a.name);
  await call(`admin/messages/class/${theirs.class_sessions}`, token, "POST", { subject: "Manual", body: "Text" }, 404);
  const ownTemplate = (await list(endpoint("message_templates"), token))
    .find(({ key, locale }) => key === "class_reminder" && locale === "en")!;
  await call(endpoint("message_templates", ownTemplate.id), token, "DELETE", undefined, 204);
  await call("admin/messages/test", token, "POST", { key: "class_reminder", locale: "en" }, 404);
}

async function waitFor(check: () => Promise<boolean>, label: string) {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (await check()) return;
    await Bun.sleep(50);
  }
  assert.fail("El cron no terminó: " + label);
}

async function publicAndCrons(a: Fixture, b: Fixture) {
  const rotate = (fixture: Fixture, business = fixture.id) =>
    call<{ key: string; prefix: string }>("admin/business/public-key", fixture.token, "POST", { business });
  const bKey = await rotate(b);
  const old = await rotate(a, b.id);
  const aKey = await rotate(a);
  assert.equal((await call(endpoint("businesses", b.id), b.token)).public_key_prefix, bKey.prefix);

  async function publicRoute(route: string, key: string, origin: string, expected = 200) {
    const response = await fetch(`${base}/api/public/${route}`, { headers: { "X-Business-Key": key, Origin: origin } });
    assert.equal(response.status, expected);
    return { body: await response.json(), origin: response.headers.get("Access-Control-Allow-Origin") };
  }
  for (const path of ["catalog", "schedule"]) {
    assert.deepEqual((await publicRoute(path, old.key, a.origin, 401)).body, { message: "Clave de API inválida" });
    for (const [fixture, key, other] of [[a, aKey, b], [b, bKey, a]] as const) {
      const result = await publicRoute(path, key.key, fixture.origin);
      assert.equal(result.origin, fixture.origin);
      assert.equal(result.body.business.name, fixture.name);
      assert(!JSON.stringify(result.body).includes(other.name));
      assert.equal((await publicRoute(path, key.key, other.origin)).origin, null);
    }
  }

  const adminRun = await call<{ expiredMemberships: number }>("admin/memberships/run-daily", a.token, "POST", {});
  assert.equal(adminRun.expiredMemberships, 1);
  assert.equal((await call(endpoint("memberships", b.rows.memberships), b.token)).status, "active");
  await call("crons/memberships_daily", root, "POST", undefined, 204);
  for (const fixture of [a, b]) {
    await waitFor(async () => (await call(endpoint("memberships", fixture.rows.memberships), fixture.token)).status === "expired",
      "memberships_daily");
    const moves = await list(endpoint("credit_movements") + query({ filter: 'reason = "expire"' }), fixture.token);
    assert(moves.some(({ business, membership }) => business === fixture.id && membership === fixture.rows.memberships));
  }
  await call("crons/jq_generate_sessions", root, "POST", undefined, 204);
  for (const fixture of [a, b]) {
    await waitFor(async () => {
      const rows = await list(endpoint("class_sessions") + query({ filter: `template = "${fixture.rows.class_templates}"` }), fixture.token);
      return rows.length > 0 && rows.every(({ business }) => business === fixture.id);
    }, "jq_generate_sessions");
  }
  await call("crons/class_reminders", root, "POST", undefined, 204);
  for (const fixture of [a, b]) {
    await waitFor(async () => {
      const logs = await list(endpoint("message_logs") + query({ filter: 'template_key = "class_reminder"' }), fixture.token);
      return logs.some(({ session, business }) => session === fixture.rows.class_sessions && business === fixture.id);
    }, "class_reminders");
  }

  const addDue = (fixture: Fixture) => fixtureRow("memberships", fixture.id, { client: fixture.alternateClient, plan: fixture.rows.plans,
    starts_on: "2020-01-01", current_period_start: "2020-01-01", current_period_end: "2020-01-28", status: "active", credits_balance: 1 });
  const dueA = addDue(a);
  const dueB = addDue(b);
  await call(endpoint("businesses", b.id), root, "PATCH", { active: false });
  await call("crons/memberships_daily", root, "POST", undefined, 204);
  await waitFor(async () => (await call(endpoint("memberships", dueA), root)).status === "expired", "memberships_daily (with inactive tenant)");
  assert.equal((await call(endpoint("memberships", dueB), root)).status, "active");
  for (const path of ["catalog", "schedule"]) await publicRoute(path, bKey.key, b.origin, 401);
  await call(endpoint("services"), b.token, "GET", undefined, 403);
}

try {
  const a = await seed("a", "America/New_York", "USD");
  const b = await seed("b", "America/Bogota", "COP");
  const schema = () => list<Collection>("collections", root);
  const collections = await schema();
  expectSchema(collections);
  const services = collections.find(({ name }) => name === "services")!;
  const original = services.listRule!;
  try {
    await call(`collections/${services.id}`, root, "PATCH", { listRule: original.replace(" && " + RULE_BUSINESS, "") });
    const changed = await schema();
    assert.throws(() => expectSchema(changed), /services\.listRule carece de regla de negocio/);
  } finally {
    await call(`collections/${services.id}`, root, "PATCH", { listRule: original });
  }
  expectSchema(await schema());
  await collectionIsolation(a, b, collections);
  const authorizedAvatar = await avatarIsolation(a, b);
  await adminIsolation(a, b);
  await publicAndCrons(a, b);
  assert.equal((await fetch(authorizedAvatar)).status, 404);
  console.log("Aislamiento verificado en 19 colecciones, rutas administrativas y públicas, caché CORS y crons.");
} finally {
  db.close();
}
