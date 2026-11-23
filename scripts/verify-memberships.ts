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

type Booking = Row & { status: string; override_note: string; membership: string };
const bookings = records("bookings");
const bookingPath = ({ id }: Row) => `${bookings}/${id}`;
const sessionPath = records("class_sessions");
const memberTwo = await call<Row>(records("clients"), owner, "POST", {
  first_name: "Membresías", last_name: "Reservas", status: "active",
});
const entitlement = (await call<Result>(route + "/assign", owner, "POST", { client: memberTwo.id, plan: pack.id })).membership;
const bookingLedger = ({ id }: Row) => call<{ items: Movement[] }>(
  records("credit_movements") + filter(`booking = '${id}'`), owner,
).then(({ items }) => items);
let minutes = 0;
function session(kind = "regular", service = pack.service) {
  return call<Row>(sessionPath, owner, "POST", {
    service, starts_at: new Date(Date.now() + (++minutes * 60_000)).toISOString(), duration_min: 60, capacity: 6, kind,
    ...(kind === "special" && { title: "Clase especial sin créditos" }),
  });
}
function reserve(session: Row, token = coach, override_note?: string, expected = 200, client = memberTwo) {
  return call<Booking>(bookings, token, "POST", { client: client.id, session: session.id, override_note }, expected);
}
function eligibility(session: Row, client = memberTwo) {
  return call<{ allowed: boolean; code: string; available: number | null }>(
    route + "/eligibility?" + new URLSearchParams({ client: client.id, session: session.id }), coach,
  );
}
const attendedSession = await session();
assert.deepEqual(await eligibility(attendedSession), { allowed: true, code: "ok", available: pack.sessions });
await action("adjust", { delta: -pack.sessions, note: "Agotar saldo" }, 200, owner, entitlement.id);
assert.deepEqual(await eligibility(attendedSession), { allowed: false, code: "no_credits", available: 0 });
const rejectedCredit = await call<{ data: { code: { code: string } } }>(bookings, reception, "POST", {
  client: memberTwo.id, session: attendedSession.id, override_note: "   ",
}, 400);
assert.equal(rejectedCredit.data.code.code, "no_credits");
await reserve(attendedSession, coach, "Excepción", 403);
const booked = await reserve(attendedSession, reception, "Excepción aprobada");
assert.equal(booked.override_note, "Excepción aprobada");
assert.equal(booked.membership, entitlement.id);
const bookingDb = new Database(dbPath);
bookingDb.exec(`CREATE TRIGGER verify_booking_rollback BEFORE UPDATE OF credits_balance ON memberships
  WHEN NEW.credits_balance = OLD.credits_balance - 1
  BEGIN SELECT RAISE(ABORT, 'verify rollback'); END`);
try {
  await call(bookingPath(booked), coach, "PATCH", { status: "attended", override_note: "Impartida" }, 400);
  assert.equal((await call<Booking>(bookingPath(booked), coach)).status, "booked");
  assert.deepEqual(await bookingLedger(booked), []);
} finally {
  bookingDb.exec("DROP TRIGGER verify_booking_rollback");
  bookingDb.close();
}
await call(bookingPath(booked), coach, "PATCH", { status: "attended", override_note: "Impartida" });
await call(bookingPath(booked), coach, "PATCH", { status: "attended", override_note: "Impartida" }, 400);
await call(bookingPath(booked), coach, "PATCH", { status: "no_show", override_note: "Corrección" });
await call(bookingPath(booked), coach, "PATCH", { status: "attended", override_note: "Corrección" });
assert.deepEqual((await bookingLedger(booked)).map(({ reason, delta }) => [reason, delta]), [["attend", -1]]);
assert.equal((await call<Membership>(`${memberships}/${entitlement.id}`, owner)).credits_balance, -1);
await call(bookingPath(booked), reception, "PATCH", { status: "cancelled", override_note: "Error de asistencia" });
assert.deepEqual((await bookingLedger(booked)).map(({ reason, delta }) => [reason, delta]).sort(), [["adjust", 1], ["attend", -1]]);
assert.equal((await call<Membership>(`${memberships}/${entitlement.id}`, owner)).credits_balance, 0);

const missing = await reserve(await session(), reception, "Excepción aprobada");
await call(bookingPath(missing), coach, "PATCH", { status: "no_show", override_note: "Corrección" });
assert.deepEqual((await bookingLedger(missing)).map(({ reason, delta, note }) => [reason, delta, note]), [["late_cancel", -1, "No-show"]]);
const late = await reserve(await session(), reception, "Excepción aprobada");
const lateResult = await call<Booking>(bookingPath(late), coach, "PATCH", { status: "cancelled" });
assert.equal(lateResult.status, "late_cancelled");
assert.deepEqual((await bookingLedger(late)).map(({ reason, delta }) => [reason, delta]), [["late_cancel", -1]]);

const { items: [online] } = await call<{ items: Row[] }>(records("services") + filter("kind = 'online' && active = true"), owner);
assert(online);
for (const exempt of [await session("special"), await session("regular", online.id)]) {
  assert.deepEqual(await eligibility(exempt), { allowed: true, code: "ok", available: null });
  const reservation = await reserve(exempt);
  await call(bookingPath(reservation), coach, "PATCH", { status: "attended", override_note: "Impartida" });
  assert.deepEqual(await bookingLedger(reservation), []);
}
const { items: [firstPlan] } = await call<{ items: (Row & { service: string })[] }>(records("plans") +
  filter("is_first_class = true && active = true"), coach);
assert(firstPlan);
const firstMember = await call<Row>(records("clients"), owner, "POST", {
  first_name: "Membresías", last_name: "Primera visita", status: "active",
});
await call(route + "/assign", reception, "POST", { client: firstMember.id, plan: firstPlan.id });
const firstBooking = await reserve(await session("regular", firstPlan.service), coach, undefined, 200, firstMember);
assert.deepEqual(await eligibility(await session("regular", firstPlan.service), firstMember), {
  allowed: false, code: "no_credits", available: 0,
});
const clientPath = records("clients") + "/" + firstMember.id;
assert.equal((await call<{ free_class_used: boolean }>(clientPath, coach)).free_class_used, false);
await call(bookingPath(firstBooking), coach, "PATCH", { status: "attended", override_note: "Impartida" });
assert.equal((await call<{ free_class_used: boolean }>(clientPath, coach)).free_class_used, true);
console.log("Elegibilidad, excepciones y reconciliación de créditos en reservas verificadas.");

async function due(daysAgo: number) {
  const client = await call<Row>(records("clients"), owner, "POST", {
    first_name: "Membresías", last_name: `Gracia ${daysAgo}`, status: "active",
  });
  const result = await call<Result>(route + "/assign", owner, "POST", {
    client: client.id, plan: pack.id, starts_on: addDays(today, -27 - daysAgo),
  });
  await action("adjust", { delta: 5 - pack.sessions, note: "Saldo de prueba" }, 200, owner, result.membership.id);
  return result.membership.id;
}
const daySeven = await due(7);
const dayEight = await due(8);
const runDaily = (token = owner, expected = 200) =>
  call<{ expiredCredits: number; expiredMemberships: number }>(route + "/run-daily", token, "POST", {}, expected);
await runDaily(reception, 403);
await runDaily(coach, 403);
assert.deepEqual(await runDaily(), { expiredCredits: 10, expiredMemberships: 1 });
const withinGrace = await call<Membership>(`${memberships}/${daySeven}`, owner);
const afterGrace = await call<Membership>(`${memberships}/${dayEight}`, owner);
assert.equal(withinGrace.status, "active");
assert.equal(withinGrace.ended_on, "");
assert.equal(afterGrace.status, "expired");
assert.equal(afterGrace.ended_on.slice(0, 10), today);
for (const membership of [withinGrace, afterGrace]) {
  assert.equal(membership.credits_balance, 0);
  const expiry = (await ledger(membership.id)).filter(({ reason }) => reason === "expire");
  assert.deepEqual(expiry.map(({ delta }) => delta), [-5]);
  const { items: audit } = await call<{ items: { summary: string }[] }>(
    records("audit_logs") + filter(`record_id = '${membership.id}' && action = 'custom'`), owner,
  );
  assert(audit.some(({ summary }) => /venci|vencid/.test(summary)));
}
assert.deepEqual(await runDaily(), { expiredCredits: 0, expiredMemberships: 0 });
assert.equal((await ledger(daySeven)).filter(({ reason }) => reason === "expire").length, 1);
console.log("Expiración, gracia, auditoría e idempotencia del cron de membresías verificadas.");

async function filterClient(name: string) {
  return call<Row>(records("clients"), owner, "POST", {
    first_name: "Filtro membresías", last_name: name, status: "active",
  });
}
const splitClient = await filterClient("Plan vencido y otro activo");
const matchedClient = await filterClient("Plan activo");
const noMembership = await filterClient("Sin membresías");
const expiredOnly = await filterClient("Solo plan vencido");
for (const [client, plan, status] of [
  [splitClient, pack, "expired"], [splitClient, firstPlan, "active"], [matchedClient, pack, "active"],
  [matchedClient, firstPlan, "expired"], [expiredOnly, pack, "expired"],
] as const) {
  await call(memberships, root, "POST", { ...seed, client: client.id, plan: plan.id, status });
}
async function filteredClients(expression: string) {
  const query = new URLSearchParams({
    filter: `first_name = 'Filtro membresías' && ${expression}`,
    expand: "memberships_via_client.plan.service",
  });
  const { items } = await call<{ items: (Row & { expand?: { memberships_via_client?: { status: string; expand?: { plan?: Row } }[] } })[] }>(
    records("clients") + "?" + query, coach,
  );
  return items;
}
const matchedPlan = await filteredClients(`memberships_via_client.plan ?= '${pack.id}' && memberships_via_client.status ?= 'active'`);
assert.deepEqual(matchedPlan.map(({ id }) => id), [matchedClient.id]);
assert(matchedPlan[0].expand?.memberships_via_client?.some((m) => m.status === "active" && m.expand?.plan?.id === pack.id));
assert.deepEqual((await filteredClients("memberships_via_client.status ?= 'active'")).map(({ id }) => id).sort(),
  [matchedClient.id, splitClient.id].sort());
assert.deepEqual((await filteredClients("memberships_via_client.status != 'active'")).map(({ id }) => id).sort(),
  [noMembership.id, expiredOnly.id].sort());
console.log("Filtrado de clientes por plan y estado de la misma membresía verificado.");
