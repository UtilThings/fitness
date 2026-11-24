import assert from "node:assert/strict";
import { Database } from "bun:sqlite";
import { startSmtpCapture, type CapturedMail } from "./verify-smtp-capture";

const [base] = process.argv.slice(2);
const password = process.env.JQ_VERIFY_PASSWORD;
const business = process.env.JQ_VERIFY_BUSINESS!;
const dbPath = process.env.JQ_VERIFY_DB;
assert(base && password && dbPath, "Ejecuta scripts/verify-api.sh");
using db = new Database(dbPath);
db.exec("PRAGMA busy_timeout = 3000");

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
const firstLogId = "sample000000001";
const addLog = db.query(
  "INSERT INTO message_logs (business, id, client, template_key, channel, status, attempts, dedupe_key) VALUES (?, ?, ?, ?, 'email', 'sent', 1, ?)",
);
addLog.run(business, firstLogId, client.id, key, "verify-message-dedupe");
assert.throws(() => addLog.run(business, "sample000000002", client.id, key, "verify-message-dedupe"), /UNIQUE constraint failed/);
await call(logs, root, "POST", { client: client.id, template_key: key, channel: "email", status: "sent", attempts: 1 }, 403);
await call(`${logs}/${firstLogId}`, root, "PATCH", { error: "Cambio externo" }, 403);
await call(`${logs}/${firstLogId}`, root, "DELETE", undefined, 403);
db.query("DELETE FROM message_logs WHERE id = ?").run(firstLogId);
await call(`${clients}/${client.id}`, owner, "DELETE", undefined, 204);

const invalid = await call<{ data: { body?: { message: string } } }>(
  `${templates}/${id}`, owner, "PATCH", { body: "{{password}}" }, 400,
);
assert.match(invalid.data.body?.message ?? "", /password/);
await call(`${templates}/${id}`, owner, "PATCH", { subject: "Asunto\nOtra línea" }, 400);
await call(`${templates}/${id}`, owner, "PATCH", { body: "Prueba de auditoría" });
const audit = "collections/audit_logs/records?" + new URLSearchParams({
  filter: `collection = "message_templates" && record_id = "${id}" && action = "update"`,
});
assert.equal((await call<{ items: unknown[] }>(audit, owner)).items.length, 1);
await call(`${templates}/${id}`, owner, "PATCH", { body });

type Row = { id: string };
type Booking = Row & { status: string };
type Log = Row & { attempts: number; error: string; client: string; dedupe_key: string; template_key: string; status: string; next_retry_at: string };
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

{
  const bulk = await createSession(5, 200);
  db.transaction(() => {
    for (let i = 0; i < 201; i++) {
      const suffix = String(i).padStart(4, "0");
      const client = `msgbulkclnt${suffix}`;
      db.query("INSERT INTO clients (business, id, first_name, last_name, status) VALUES (?, ?, 'Bulk', 'Test', 'active')").run(business, client);
      db.query("INSERT INTO bookings (business, id, session, client, status, source) VALUES (?, ?, ?, ?, 'booked', 'admin')")
        .run(business, `msgbulkbook${suffix}`, bulk.id, client);
    }
  })();
  await call(manual(bulk), owner, "POST", draft, 400);
  assert.equal((await sessionLogs(bulk, "manual")).length, 0);
}
console.log("Vista previa, permisos, límites y mensaje manual verificados.");

async function verifySmtp() {
  if (process.env.JQ_VERIFY_SMTP_CAPTURE === "0") {
    console.log("Se omitió la captura SMTP por JQ_VERIFY_SMTP_CAPTURE=0.");
    return;
  }
  const captured: CapturedMail[] = [];
  let smtp: Awaited<ReturnType<typeof startSmtpCapture>>;
  try {
    smtp = await startSmtpCapture(captured);
  } catch (error) {
    if (["EACCES", "EPERM", "EAFNOSUPPORT"].includes((error as NodeJS.ErrnoException).code ?? "")) {
      console.log("Se omitió la captura SMTP porque no se pudo abrir un puerto local.");
      return;
    }
    throw error;
  }

  const smtpPort = smtp.port;
  const email = (name: string) => `verify-${name}@example.test`;
  const mailFor = (name: string) => captured.filter(({ recipient }) => recipient === email(name));
  const smtpClient = (name: string, first_name: string, locale: "es" | "en", hasEmail = true) =>
    call<Row>(clients, owner, "POST", {
      first_name, last_name: "Captura SMTP", email: hasEmail ? email(name) : "", locale, status: "active",
    });
  const quotedPrintable = (text: string) => text.replace(/=\r?\n/g, "")
    .replace(/=([0-9a-f]{2})/gi, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)));
  const subjectContains = (name: string, value: string) => mailFor(name).some(({ mime }) => {
    const subject = /^Subject: (.+)$/mi.exec(mime.replace(/\r\n[ \t]+/g, " "))?.[1] ?? "";
    const decoded = subject.replace(/=\?utf-8\?([bq])\?([^?]+)\?=/gi, (_, encoding: string, word: string) =>
      encoding.toLowerCase() === "b"
        ? Buffer.from(word, "base64").toString("utf8")
        : quotedPrintable(word.replaceAll("_", " ")));
    return decoded.includes(value);
  });

  try {
    await call("settings", root, "PATCH", {
      smtp: { enabled: true, host: "127.0.0.1", port: smtpPort, tls: false },
      meta: { senderAddress: "studio@example.test", senderName: "JQ Fitness" },
    });
    const bookedSession = await createSession(6, 2);
    const es = await smtpClient("es", "<script>Ana</script>", "es");
    const en = await smtpClient("en", "Alex", "es");
    const updated = await call<{ locale: string }>(`${clients}/${en.id}`, owner, "PATCH", { locale: "en" });
    assert.equal(updated.locale, "en");
    const waiting = await smtpClient("waiting", "Jamie", "en");
    const esBooking = await reserve(bookedSession, es);
    await reserve(bookedSession, en);
    assert.equal((await reserve(bookedSession, waiting)).status, "waitlisted");
    assert.equal(mailFor("waiting").length, 0);
    assert(subjectContains("es", "Reserva confirmada"));
    assert(subjectContains("en", "Booking confirmed"));
    const html = mailFor("es")[0]?.mime.split(/Content-Type: text\/html/i)[1] ?? "";
    const decodedHtml = quotedPrintable(html);
    const escapedName = decodedHtml.match(/&lt;script&gt;Ana&lt;\/script&gt;/)?.[0];
    assert(escapedName);
    assert(!decodedHtml.includes("<script>Ana</script>"));
    console.log(`Nombre de prueba en la parte HTML capturada: ${escapedName}`);
    assert((await sessionLogs(bookedSession, "booking_confirmed")).every(({ status }) => status === "sent"));

    await call(manual(bookedSession), reception, "POST", { subject: "Aviso verificado", body: "Hola {{client_first_name}}" });
    assert.equal((await sessionLogs(bookedSession, "manual")).filter(({ status }) => status === "sent").length, 3);
    assert(subjectContains("waiting", "Aviso verificado"));
    await call(testMail, owner, "POST", { key: "booking_confirmed", locale: "en" });
    assert(captured.some(({ recipient }) => recipient === "owner@catalog-verify.example.test"));

    await call(`${bookings}/${esBooking.id}`, owner, "PATCH", { status: "cancelled", override_note: "Prueba SMTP promoción" });
    assert(subjectContains("waiting", "Spot available"));
    await call("crons/class_reminders", root, "POST", undefined, 204);
    await wait(async () => (await sessionLogs(bookedSession, "class_reminder")).length === 2 && subjectContains("en", "Reminder"));
    await call("crons/class_reminders", root, "POST", undefined, 204);
    await call(`${sessions}/${bookedSession.id}`, owner, "PATCH", { status: "cancelled", cancel_reason: "Cambio de agenda" });
    assert.equal((await sessionLogs(bookedSession, "class_cancelled")).filter(({ status }) => status === "sent").length, 2);
    assert.equal(mailFor("en").filter(({ mime }) => mime.includes("Class update")).length, 1);
    assert.equal(mailFor("en").filter(({ mime }) => mime.includes("Reminder:")).length, 1);

    const inactive = await smtpClient("inactive", "Cliente inactivo", "es");
    const withoutEmail = await smtpClient("no-email", "Cliente sin correo", "es", false);
    await call(`${clients}/${inactive.id}`, owner, "PATCH", { status: "inactive" });
    const excluded = await createSession(7, 3);
    for (const recipient of [inactive, withoutEmail]) {
      // La prueba crea una reserva interna en un estado que la API pública rechazaría.
      db.query("INSERT INTO bookings (business, id, session, client, status, source) VALUES (?, ?, ?, ?, 'booked', 'admin')")
        .run(business, recipient === inactive ? "msginactive0001" : "msgnoemail00001", excluded.id, recipient.id);
    }
    await call("crons/class_reminders", root, "POST", undefined, 204);
    assert.deepEqual(await call(manual(excluded), owner, "POST", draft), { sent: 0, failed: 0, skipped: 2 });
    assert.equal(mailFor("inactive").length, 0);
    assert.equal((await sessionLogs(excluded, "manual")).length, 0);
    assert.equal((await sessionLogs(excluded, "class_reminder")).length, 0);

    const [plan] = db.query<{ id: string }, []>("SELECT id FROM plans ORDER BY id").all();
    const [admin] = db.query<{ id: string }, []>("SELECT id FROM admins WHERE role = 'owner'").all();
    assert(plan && admin);
    db.query("INSERT INTO payments (business, currency, id, client, plan, amount_cents, status, due_on, recorded_by) VALUES (?, 'USD', ?, ?, ?, 26800, 'pending', ?, ?)")
      .run(business, "msgdueverify001", en.id, plan.id, "2026-03-11 00:00:00.000Z", admin.id);
    db.query("INSERT INTO memberships (business, id, client, plan, status, starts_on, current_period_start, current_period_end) VALUES (?, ?, ?, ?, 'active', ?, ?, ?)")
      .run(business, "msgendverify001", en.id, plan.id, "2026-02-13 00:00:00.000Z", "2026-02-13 00:00:00.000Z", "2026-03-13 05:00:00.000Z");
    const beforeDaily = mailFor("en").length;
    for (const [instant, count] of [["2026-03-08T12:59:59Z", 0], ["2026-03-08T13:00:00Z", 2], ["2026-03-08T13:45:00Z", 2]] as const) {
      await call("verify/messages/daily", root, "POST", { instant });
      assert.equal(mailFor("en").length - beforeDaily, count);
    }
    assert(subjectContains("en", "Upcoming payment"));
    assert(subjectContains("en", "Renewal notice"));

    const retrySession = await createSession(8, 3);
    const retryClient = await smtpClient("retry", "Lee", "en");
    await smtp.close();
    assert.equal((await reserve(retrySession, retryClient)).status, "booked");
    const [failed] = await sessionLogs(retrySession, "booking_confirmed");
    assert(failed && failed.status === "failed" && failed.next_retry_at);
    assert.equal(failed.attempts, 1);
    assert.equal(mailFor("retry").length, 0);
    const maxAttemptSession = await createSession(9, 3);
    const maxAttemptClient = await smtpClient("max-attempt", "Taylor", "en");
    await reserve(maxAttemptSession, maxAttemptClient);
    const [maxAttempt] = await sessionLogs(maxAttemptSession, "booking_confirmed");
    assert(maxAttempt);
    async function runRetry(id: string) {
      db.query("UPDATE message_logs SET next_retry_at = ? WHERE id = ?")
        .run(new Date(Date.now() - 1_000).toISOString().replace("T", " "), id);
      await call("crons/retry_failed_messages", root, "POST", undefined, 204);
    }
    for (const attempt of [2, 3]) {
      await runRetry(maxAttempt.id);
      await wait(async () => {
        const [log] = await sessionLogs(maxAttemptSession, "booking_confirmed");
        return log?.attempts === attempt && log.error === "No se pudo enviar por SMTP." &&
          (attempt === 2 ? !!log.next_retry_at : log.next_retry_at === "");
      });
    }
    smtp = await startSmtpCapture(captured, smtpPort);
    await runRetry(failed.id);
    await wait(async () => (await sessionLogs(retrySession, "booking_confirmed"))[0]?.status === "sent");
    const [retried] = await sessionLogs(retrySession, "booking_confirmed");
    assert.equal(retried?.attempts, 2);
    assert.equal(retried?.next_retry_at, "");
    assert.equal(mailFor("retry").length, 1);
    assert.equal(mailFor("max-attempt").length, 0);
    console.log("SMTP de captura: idiomas, HTML escapado, seis avisos, exclusiones, mensaje manual y reintento verificados.");
  } finally {
    await smtp.close();
  }
}

await verifySmtp();
