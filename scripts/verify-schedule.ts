import assert from "node:assert/strict";
import { addLocalDays, localToUtc, utcToLocal } from "../api/src/lib/tz";

const base = process.argv[2];
const password = process.env.JQ_VERIFY_PASSWORD;
assert(base && password, "Ejecuta scripts/verify-api.sh");

type Json = Record<string, unknown>;
async function call<T>(
  path: string,
  token?: string,
  method = "GET",
  body?: Json,
  status = 200,
): Promise<T> {
  const response = await fetch(`${base}/api/${path}`, {
    method,
    headers: {
      ...(token && { Authorization: token }),
      ...(body && { "Content-Type": "application/json" }),
    },
    body: body && JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  });
  const data = response.status === 204 ? null : await response.json();
  assert.equal(
    response.status,
    status,
    `${method} ${path}: ${JSON.stringify(data)}`,
  );
  return data as T;
}

async function auth(collection: string, email: string) {
  return (
    await call<{ token: string }>(
      `collections/${collection}/auth-with-password`,
      undefined,
      "POST",
      { identity: email, password },
    )
  ).token;
}

type Template = {
  id: string;
  service: string;
  weekday: number;
  start_time: string;
  capacity: number;
};
type Session = {
  id: string;
  template: string;
  coach: string;
  service: string;
  status: string;
  starts_at: string;
  kind: string;
  cancel_reason: string;
};
const templates = "collections/class_templates/records";
const sessions = "collections/class_sessions/records";
const blocks = "collections/schedule_blocks/records";
const generate = "admin/sessions/generate";

const root = await auth("_superusers", "catalog-verify@example.test");
async function staff(role: string) {
  const email = `schedule-${role}@example.test`;
  const { id } = await call<{ id: string }>(
    "collections/admins/records",
    root,
    "POST",
    {
      email,
      role,
      name: role,
      active: true,
      password,
      passwordConfirm: password,
    },
  );
  return { id, token: await auth("admins", email) };
}

const { token: owner } = await staff("owner");
const { token: reception } = await staff("reception");
const coach = await staff("coach");
const listSessions = (token = owner) =>
  call<{ items: Session[]; totalItems: number }>(
    `${sessions}?perPage=200&sort=starts_at,id`,
    token,
  );
const getSession = (id: string) => call<Session>(`${sessions}/${id}`, owner);
const postGenerate = (body: Json = {}, token = owner) =>
  call<{
    created: number;
    skipped_existing: number;
    skipped_blocked: number;
    window: { from: string; to: string };
  }>(generate, token, "POST", body);

const seeded = await call<{ items: Template[]; totalItems: number }>(
  templates,
  owner,
);
assert.equal(seeded.totalItems, 9);
assert.deepEqual(
  seeded.items
    .map(({ weekday, start_time, capacity }) => [weekday, start_time, capacity])
    .sort(),
  [
    [1, "19:30", 12],
    [2, "09:00", 6],
    [2, "17:30", 6],
    [2, "19:00", 6],
    [3, "19:30", 12],
    [4, "09:00", 6],
    [4, "17:30", 6],
    [4, "19:00", 6],
    [6, "09:00", 12],
  ].sort(),
);
assert.equal((await listSessions()).totalItems, 0);
await call(generate, undefined, "POST", {}, 401);
await call(generate, coach.token, "POST", {}, 403);
await call(generate, reception, "POST", {}, 403);
await call(templates, reception, "POST", {}, 400);
await call(blocks, reception, "POST", {}, 400);
await call(generate, owner, "POST", { weeks: 13 }, 400);
const initial = await postGenerate();
assert.equal(initial.created, 36);
const from = initial.window.from;
assert.deepEqual(await postGenerate({ from }), {
  created: 0,
  skipped_existing: 36,
  skipped_blocked: 0,
  window: { from, to: addLocalDays(from, 27) },
});
const [first, original, ...other] = (
  await listSessions(reception)
).items.filter((row) => Date.parse(row.starts_at) > Date.now());
assert(first && original && other.length);
assert.equal((await listSessions(coach.token)).totalItems, 36);
const fixture = { service: first.service, duration_min: 60, capacity: 5 };
await call(
  sessions,
  owner,
  "POST",
  { ...fixture, template: first.template, starts_at: first.starts_at },
  400,
);
for (let index = 0; index < 2; index++) {
  await call(sessions, reception, "POST", {
    ...fixture,
    starts_at: first.starts_at,
    kind: "special",
  });
}

const cancel = `admin/sessions/${first.id}/cancel`;
await call(cancel, coach.token, "POST", { reason: "Prueba de permisos" }, 403);
await call(cancel, reception, "POST", {}, 400);
const cancelled = await call<Session>(cancel, reception, "POST", {
  reason: "Coach enfermo",
});
assert.equal(cancelled.status, "cancelled");
assert.equal(cancelled.cancel_reason, "Coach enfermo");
await call(cancel, reception, "POST", { reason: "Ya cancelada" }, 400);

const move = `admin/sessions/${original.id}/move`;
const destination = addLocalDays(from, 30);
const reason = "Cambio de horario";
await call(
  move,
  reception,
  "POST",
  { starts_at: "2000-01-01T00:00:00Z", reason },
  400,
);
await call(
  blocks,
  owner,
  "POST",
  { title: "Rango inválido", date_from: destination, date_to: from },
  400,
);
const moved = await call<{ cancelled: Session; created: Session }>(
  move,
  reception,
  "POST",
  { starts_at: localToUtc(destination, "09:00"), coach: coach.id, reason },
);
assert.equal(moved.cancelled.status, "cancelled");
assert.equal(moved.created.kind, "special");
assert.equal(moved.created.template, "");
assert.equal((await postGenerate({ from })).created, 0);

const template = first.template;
const past = await call<Session>(sessions, owner, "POST", {
  ...fixture,
  template,
  starts_at: "2000-01-01T00:00:00Z",
});
const beforeAssignment = (await listSessions()).items.filter(
  (row) =>
    row.template === template &&
    row.status === "scheduled" &&
    Date.parse(row.starts_at) > Date.now(),
);
const assignment = await call<{ updated_sessions: number }>(
  `admin/class-templates/${template}/assign-coach`,
  owner,
  "POST",
  { coach: coach.id, apply_to_future: true },
);
assert.equal(assignment.updated_sessions, beforeAssignment.length);
for (const row of beforeAssignment)
  assert.equal((await getSession(row.id)).coach, coach.id);
assert.equal((await getSession(first.id)).coach, first.coach);
assert.equal((await getSession(past.id)).coach, "");

const blockDate = other
  .map((row) => utcToLocal(row.starts_at.replace(" ", "T")).date)
  .find((date) => date > from);
assert.ok(blockDate);
const affected = (await listSessions()).items.filter(
  (row) =>
    row.status === "scheduled" &&
    utcToLocal(row.starts_at.replace(" ", "T")).date === blockDate,
);
assert.ok(affected.length > 0);
const { id: blockId } = await call<{ id: string }>(blocks, owner, "POST", {
  title: "Feriado",
  date_from: blockDate,
  date_to: blockDate,
});
for (const row of affected) {
  const record = await getSession(row.id);
  assert.equal(record.status, "cancelled");
  assert.equal(record.cancel_reason, "Bloqueo: Feriado");
}
const afterBlock = await postGenerate({ from });
assert.equal(afterBlock.created, 0);
assert.ok(afterBlock.skipped_blocked > 0);
assert.equal(
  (await listSessions()).items.filter(
    (row) =>
      row.status === "scheduled" &&
      utcToLocal(row.starts_at.replace(" ", "T")).date === blockDate,
  ).length,
  0,
);
const stillScheduled = other.find(
  (row) => !affected.some((item) => item.id === row.id),
);
assert.ok(stillScheduled);
await call(
  `admin/sessions/${stillScheduled.id}/move`,
  reception,
  "POST",
  { starts_at: localToUtc(blockDate, "23:59"), reason },
  400,
);
await call(`${blocks}/${blockId}`, owner, "DELETE", undefined, 204);
for (const row of affected)
  assert.equal((await getSession(row.id)).status, "cancelled");
assert.equal((await postGenerate({ from })).created, 0);

const cronId = "jq_generate_sessions";
const crons = await call<{ id: string; expression: string }[]>("crons", root);
assert.ok(
  crons.some(
    ({ id, expression }) => id === cronId && expression === "0 7 * * *",
  ),
);
await call(`crons/${cronId}`, root, "POST", undefined, 204);

const dst = await postGenerate({ from: "2026-10-25", weeks: 2 });
assert.equal(dst.created + dst.skipped_existing, 18);
const slots = (await listSessions()).items;
for (const starts of ["2026-10-26 23:30:00.000Z", "2026-11-03 00:30:00.000Z"]) {
  assert.ok(slots.some((row) => row.starts_at === starts && row.template));
}

const concurrentFrom = addLocalDays(from, 70);
const concurrent = await Promise.all([
  postGenerate({ from: concurrentFrom, weeks: 1 }),
  postGenerate({ from: concurrentFrom, weeks: 1 }),
]);
assert.equal(concurrent[0].created + concurrent[1].created, 9);
assert.equal(
  concurrent[0].skipped_existing + concurrent[1].skipped_existing,
  9,
);

console.log(
  "Horarios verificados en PocketBase: seed, generación, índice, rutas, bloqueos, roles, cron y DST.",
);
