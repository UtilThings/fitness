import assert from "node:assert/strict";
import { CATALOG_SEED } from "../api/src/lib/catalog";

const [base, phase] = process.argv.slice(2);
const password = process.env.JQ_VERIFY_PASSWORD;
const business = process.env.JQ_VERIFY_BUSINESS!;
assert(
  base && password && ["seed", "restart"].includes(phase),
  "Ejecuta scripts/verify-api.sh",
);

type Json = Record<string, unknown>;
type RecordData = Json & { id: string };
type ServiceData = RecordData & { slug: string; active: boolean; sort: number };
type PlanData = RecordData & {
  name: string;
  service: string;
  active: boolean;
  sort: number;
  price_cents: number;
};

const services = "collections/services/records";
const plans = "collections/plans/records";
const admins = "collections/admins/records";
const records = { services, plans, admins };
const roles = ["owner", "coach", "reception"] as const;
type Role = (typeof roles)[number];
const url = (path: string, filter: string, sort = "sort,name,id") =>
  path + "?" + new URLSearchParams({ filter, sort });

async function call<T = Json>(
  path: string,
  {
    method = "GET",
    token,
    body,
    expected = 200,
  }: {
    method?: string;
    token?: string;
    body?: Json;
    expected?: number | number[];
  } = {},
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
  const statuses = Array.isArray(expected) ? expected : [expected];
  assert(
    statuses.includes(response.status),
    `${method} ${path}: HTTP ${response.status}, esperado ${statuses.join("/")} · ${JSON.stringify(data)}`,
  );
  return data as T;
}

async function auth(collection: string, email: string) {
  const { token, record } = await call<{ token: string; record: RecordData }>(
    `collections/${collection}/auth-with-password`,
    { method: "POST", body: { identity: email, password } },
  );
  return { token, id: record.id };
}

async function list<T extends RecordData>(path: string, token?: string) {
  const { items, totalItems } = await call<{ items: T[]; totalItems: number }>(
    path,
    { token },
  );
  assert.equal(
    items.length,
    totalItems,
    "Los datos de prueba caben en una página",
  );
  return items;
}

async function expectField(
  path: string,
  method: string,
  token: string,
  body: Json,
  field: string,
) {
  const result = await call<{ data: Record<string, { message: string }> }>(
    path,
    {
      method,
      token,
      body,
      expected: 400,
    },
  );
  assert(
    result.data[field]?.message,
    `Falta el error en ${field}: ${JSON.stringify(result)}`,
  );
  return result.data[field].message;
}

const root = await auth("_superusers", "catalog-verify@example.test");
const staff = {} as Record<Role, Awaited<ReturnType<typeof auth>>>;
for (const role of roles) {
  const email = `${role}@catalog-verify.example.test`;
  if (phase === "seed") {
    await call(admins, {
      method: "POST",
      token: root.token,
      body: {
        business, email,
        password,
        passwordConfirm: password,
        name: role,
        role,
        active: true,
      },
    });
  }
  staff[role] = await auth("admins", email);
}
const owner = staff.owner.token;
const seedServices = await list<ServiceData>(
  services + "?sort=sort,name",
  owner,
);
const seedPlans = await list<PlanData>(plans, owner);
const editPrice = CATALOG_SEED[1].plans[1].price_cents + 25;
const editedName = CATALOG_SEED[1].plans[1].name;

assert.deepEqual(
  seedServices.map(({ slug }) => slug),
  CATALOG_SEED.map(({ slug }) => slug),
);
assert.equal(seedPlans.length, 10);
for (const { plans: sourcePlans, ...service } of CATALOG_SEED) {
  const seeded = seedServices.find(({ slug }) => slug === service.slug)!;
  for (const [field, value] of Object.entries(service)) {
    assert.equal(seeded[field], value, `${service.slug}.${field}`);
  }
  const related = seedPlans.filter(({ service }) => service === seeded.id);
  assert.equal(related.length, sourcePlans.length);
  for (const source of sourcePlans) {
    const row = related.find(({ name }) => name === source.name);
    assert(row, `Falta ${source.name}`);
    for (const [field, value] of Object.entries(source)) {
      const expected =
        phase === "restart" &&
        source.name === editedName &&
        field === "price_cents"
          ? editPrice
          : value;
      assert.equal(row[field], expected, `${source.name}.${field}`);
    }
  }
}
const edited = seedPlans.find(({ name }) => name === editedName)!;
const jump = seedServices.find(({ slug }) => slug === "tropical-jump")!;
const jumpPlans = seedPlans.filter(({ service }) => service === jump.id);
const single = jumpPlans.find(({ name }) => name === "Single Class")!;
const trial = jumpPlans.find(({ is_first_class }) => is_first_class === true)!;

if (phase === "seed") {
  await call(plans + "/" + edited.id, {
    method: "PATCH",
    token: owner,
    body: { price_cents: editPrice },
  });
  console.log(
    "Seed verificado: 5 servicios, 10 planes y paridad de sus valores.",
  );
} else {
  for (const collection of ["services", "plans"] as const) {
    const path = records[collection];
    assert.deepEqual(await list(path), []);
    const seed = collection === "services" ? jump : single;
    for (const role of ["coach", "reception"] as const) {
      const token = staff[role].token;
      assert.equal(
        (await list(path, token)).length,
        collection === "services" ? 5 : 10,
      );
      await call(path, { method: "POST", token, body: {}, expected: 400 });
      await call(path + "/" + seed.id, {
        method: "PATCH",
        token,
        body: { name: "Cambio" },
        expected: 404,
      });
      await call(path + "/" + seed.id, {
        method: "DELETE",
        token,
        expected: 404,
      });
    }
  }

  const paid = { service: jump.id, name: "Prueba", billing_unit: "per_class" };
  const firstClass = {
    ...paid,
    price_cents: 0,
    billing_unit: "first_visit",
    is_first_class: true,
  };
  assert.match(
    await expectField(plans, "POST", owner, firstClass, "is_first_class"),
    /Ya existe/,
  );
  await call(plans + "/" + trial.id, {
    method: "PATCH",
    token: owner,
    body: { note: "Editado" },
  });
  for (const price of [-5, 0, 0.5]) {
    await expectField(
      plans,
      "POST",
      owner,
      { ...paid, price_cents: price },
      "price_cents",
    );
  }
  await expectField(
    plans,
    "POST",
    owner,
    { ...paid, is_first_class: true, billing_unit: "first_visit" },
    "price_cents",
  );

  const updated = await call<ServiceData>(services + "/" + jump.id, {
    method: "PATCH",
    token: owner,
    body: { cancellation_hours: 18, default_coach: staff.coach.id },
  });
  assert.equal(updated.cancellation_hours, 18);
  await call(admins + "/" + staff.coach.id, {
    method: "DELETE",
    token: owner,
    expected: 409,
  });

  const denied = await call<{ message: string }>(services + "/" + jump.id, {
    method: "DELETE",
    token: owner,
    expected: 400,
  });
  assert.match(denied.message, /Desactívalo en su lugar/);

  const move = {
    updates: [
      { id: single.id, sort: trial.sort, previous: single.sort },
      { id: trial.id, sort: single.sort, previous: trial.sort },
    ],
  };
  const orderPath = "catalog/plans/order";
  await call(orderPath, {
    method: "PATCH",
    token: staff.coach.token,
    body: move,
    expected: 403,
  });
  await call(orderPath, {
    method: "PATCH",
    token: owner,
    body: move,
    expected: 204,
  });
  await call(orderPath, {
    method: "PATCH",
    token: owner,
    body: move,
    expected: 409,
  });
  const jumpFilter = url(plans, `service = "${jump.id}"`);
  assert.deepEqual(
    (await list(jumpFilter, owner)).map(({ id }) => id),
    [trial.id, single.id],
  );

  await call(services + "/" + jump.id, {
    method: "PATCH",
    token: owner,
    body: { active: false },
  });
  assert(
    (await list<PlanData>(jumpFilter, owner)).every(({ active }) => !active),
  );
  assert.match(
    await expectField(
      plans + "/" + single.id,
      "PATCH",
      owner,
      { active: true },
      "active",
    ),
    /servicio está inactivo/i,
  );
  assert.match(
    await expectField(
      plans,
      "POST",
      owner,
      { ...paid, price_cents: 100 },
      "active",
    ),
    /servicio está inactivo/i,
  );
  const audit = await list(
    url(
      "collections/audit_logs/records",
      `record_id = "${jump.id}" && action = "custom"`,
      "created",
    ),
    owner,
  );
  assert.equal(audit.length, 1);
  assert.equal(audit[0].actor, staff.owner.id);
  assert.match(String(audit[0].summary), /Tropical Jump: 2/);

  const member = await call<RecordData>("collections/clients/records", {
    method: "POST",
    token: owner,
    body: { first_name: "Prueba", last_name: "Catálogo", status: "active" },
  });
  const membership = await call<RecordData>("collections/memberships/records", {
    method: "POST",
    token: root.token,
    body: {
      business, client: member.id,
      plan: single.id,
      status: "expired",
      starts_on: "2026-01-05",
      current_period_start: "2026-01-05",
      current_period_end: "2026-02-01",
    },
  });
  const blocked = await call<{ message: string }>(plans + "/" + single.id, {
    method: "DELETE",
    token: owner,
    expected: 400,
  });
  assert.match(blocked.message, /Desactívalo en su lugar/);
  await call(plans + "/" + trial.id, {
    method: "DELETE",
    token: owner,
    expected: 204,
  });
  await call("collections/memberships/records/" + membership.id, {
    method: "DELETE",
    token: root.token,
    expected: 204,
  });

  await call(services + "/" + jump.id, {
    method: "PATCH",
    token: owner,
    body: { active: true },
  });
  assert.equal(
    (await call<PlanData>(plans + "/" + single.id, { token: owner })).active,
    false,
  );
  const competing = await Promise.all(
    ["Primera clase A", "Primera clase B"].map((name) =>
      call(plans, {
        method: "POST",
        token: owner,
        body: { ...firstClass, name },
        expected: [200, 400],
      }),
    ),
  );
  assert.equal(
    competing.filter((result) => typeof result.id === "string").length,
    1,
  );
  const rejected = competing.find((result) => result.status === 400);
  assert.match(JSON.stringify(rejected?.data), /is_first_class/);

  const created = await call<ServiceData>(services, {
    method: "POST",
    token: owner,
    body: {
      name: "Servicio temporal",
      slug: "servicio-temporal",
      kind: "online",
    },
  });
  assert.equal(created.active, true);
  await call(services + "/" + created.id, {
    method: "PATCH",
    token: owner,
    body: { active: false },
  });
  const withoutPlans = await list(
    url(
      "collections/audit_logs/records",
      `record_id = "${created.id}" && action = "custom"`,
      "created",
    ),
    owner,
  );
  assert.equal(withoutPlans.length, 1);
  assert.match(String(withoutPlans[0].summary), /: 0$/);
  await call(services + "/" + created.id, {
    method: "DELETE",
    token: owner,
    expected: 204,
  });
  const deleted = await list(
    url(
      "collections/audit_logs/records",
      `record_id = "${created.id}" && action = "delete"`,
      "created",
    ),
    owner,
  );
  assert.equal(deleted.length, 1);
  assert.equal(deleted[0].actor, staff.owner.id);

  console.log(
    "Catálogo verificado tras reiniciar: precio conservado, permisos, validaciones, orden, cascada y auditoría.",
  );
}
