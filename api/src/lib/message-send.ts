import { relatedRecord, serviceContext } from "./message-context";
import { isEligible, MAX_ATTEMPTS, nextRetry, resolveLocale } from "./message-policy";
import { renderTemplate, type Locale, type MessageKey, type ServiceKey, type Template, type Variables } from "./message-render";

export type MessageApp = Pick<core.App,
  "findRecordsByFilter" | "findRecordById" | "findCollectionByNameOrId" | "runInTransaction" |
  "save" | "settings" | "newMailClient" | "logger">;

type Rendered = ReturnType<typeof renderTemplate>;

export interface MessageChannel {
  name: string;
  send(message: Rendered & { to: string }): void;
}

// To add SMS, register a channel implementation and extend the log's channel select.
function channels(app: MessageApp): Record<string, MessageChannel> {
  return {
    email: {
      name: "email",
      send({ to, subject, body, html }) {
        const { smtp, meta } = app.settings();
        if (!smtp.enabled || !smtp.host || !meta.senderAddress) throw new Error("SMTP disabled");
        const message = new MailerMessage({
          from: { address: meta.senderAddress, name: meta.senderName },
          to: [{ address: to }],
          subject,
          text: body,
          html,
        });
        app.newMailClient().send(message);
      },
    },
  };
}

export function sendTestMessage(app: MessageApp, recipient: string, template: Template, vars: Variables) {
  channels(app).email!.send({ to: recipient, ...renderTemplate(template, vars) });
}

function clientDetails(client: core.Record) {
  return { status: client.getString("status"), email: client.getString("email"), locale: client.getString("locale") };
}

export function clientVariables(client: core.Record): Variables {
  return {
    client_first_name: client.getString("first_name"),
    studio_name: $os.getenv("STUDIO_NAME").trim() || "JQ Fitness",
    studio_phone: $os.getenv("STUDIO_PHONE").trim(),
  };
}

function activeTemplate(app: MessageApp, key: ServiceKey, locale: Locale) {
  const find = (language: Locale) =>
    app.findRecordsByFilter("message_templates", "key = {:key} && locale = {:locale}", "", 1, 0, { key, locale: language })[0];
  const record = find(locale) ?? find(locale === "es" ? "en" : "es");
  if (!record?.getBool("active")) return;
  return { key, locale: resolveLocale({ locale: record.getString("locale") }), subject: record.getString("subject"), body: record.getString("body") };
}

type BaseOptions = { client: core.Record; session?: string; dedupeKey?: string };
type Context = Variables | ((locale: Locale) => Variables);
type ServiceOptions = BaseOptions & { key: ServiceKey; context: Context };
type Result = "sent" | "failed" | "skipped";
const LEASE_MS = 60 * 60_000;

function sqlDate(date: Date): string {
  return date.toISOString().replace("T", " ");
}

function firstClaim(app: MessageApp, options: BaseOptions & { key: MessageKey }, now: Date): core.Record | undefined {
  let claimed: core.Record | undefined;
  app.runInTransaction((tx) => {
    const dedupeKey = options.dedupeKey ?? "";
    if (dedupeKey && tx.findRecordsByFilter("message_logs", "dedupe_key = {:key}", "", 1, 0, { key: dedupeKey }).length) return;
    const log = new Record(tx.findCollectionByNameOrId("message_logs"), {
      client: options.client.id,
      session: options.session ?? "",
      template_key: options.key,
      channel: "email",
      status: "failed",
      error: "El intento no quedó confirmado.",
      attempts: 1,
      next_retry_at: options.key === "manual" ? "" : sqlDate(new Date(now.getTime() + LEASE_MS)),
      dedupe_key: dedupeKey,
    });
    tx.save(log);
    claimed = log;
  });
  return claimed;
}

function deliver(app: MessageApp, log: core.Record, client: core.Record, template: Template, vars: () => Variables): Result {
  let result: Result = "failed";
  let error = "";
  let retryable = template.key !== "manual";
  let rendered: Rendered | undefined;
  try {
    rendered = renderTemplate(template, vars());
  } catch {
    error = "No se pudo renderizar la plantilla.";
    retryable = false;
  }
  if (rendered) {
    try {
      channels(app).email!.send({ to: client.getString("email"), ...rendered });
      result = "sent";
    } catch {
      error = "No se pudo enviar por SMTP.";
    }
  }
  const retry = result === "failed" && retryable ? nextRetry(log.getInt("attempts"), new Date()) : null;
  log.load({ status: result, error, next_retry_at: retry ? sqlDate(retry) : "" });
  app.save(log);
  if (error) app.logger().warn(error, "message_log", log.id);
  return result;
}

export function sendServiceMessage(app: MessageApp, options: ServiceOptions): Result {
  try {
    const details = clientDetails(options.client);
    if (!isEligible(details, options.key)) return "skipped";
    const template = activeTemplate(app, options.key, resolveLocale(details));
    if (!template) return "skipped";
    const log = firstClaim(app, options, new Date());
    if (!log) return "skipped";
    return deliver(app, log, options.client, template, () => ({
      ...clientVariables(options.client),
      ...(typeof options.context === "function" ? options.context(template.locale) : options.context),
    }));
  } catch {
    app.logger().error("No se pudo procesar el mensaje del servicio.", "key", options.key);
    return "failed";
  }
}

export function sendManualMessage(app: MessageApp, options: BaseOptions & { template: Template; context: Context; locale?: Locale }): Result {
  try {
    const details = clientDetails(options.client);
    if (!isEligible(details, "manual")) return "skipped";
    const log = firstClaim(app, { ...options, key: "manual" }, new Date());
    if (!log) return "skipped";
    return deliver(app, log, options.client, options.template, () => ({
      ...clientVariables(options.client),
      ...(typeof options.context === "function" ? options.context(options.locale ?? resolveLocale(details)) : options.context),
    }));
  } catch {
    app.logger().error("No se pudo procesar el mensaje manual.");
    return "failed";
  }
}

function claimRetry(app: MessageApp, id: string, now: Date, retryable: boolean) {
  let claimed: core.Record | undefined;
  app.runInTransaction((tx) => {
    const log = tx.findRecordById("message_logs", id);
    const next = log.getString("next_retry_at");
    const attempts = log.getInt("attempts");
    if (log.getString("status") !== "failed" || attempts >= MAX_ATTEMPTS || !next || next > sqlDate(now)) return;
    log.set("next_retry_at", "");
    if (retryable) {
      log.set("attempts", attempts + 1);
      log.set("error", "El intento no quedó confirmado.");
      if (attempts + 1 < MAX_ATTEMPTS) log.set("next_retry_at", sqlDate(new Date(now.getTime() + LEASE_MS)));
    }
    tx.save(log);
    if (retryable) claimed = log;
  });
  return claimed;
}

export function retryFailedMessages(app: MessageApp, now = new Date()) {
  const queue = app.findRecordsByFilter("message_logs",
    "status = 'failed' && next_retry_at != '' && next_retry_at <= {:now} && attempts < {:max}",
    "next_retry_at,id", 0, 0, { now: sqlDate(now), max: MAX_ATTEMPTS });
  for (const candidate of queue) {
    if (!candidate) continue;
    try {
      const key = candidate.getString("template_key") as ServiceKey;
      const client = app.findRecordById("clients", candidate.getString("client"));
      const details = clientDetails(client);
      const session = relatedRecord(app, "class_sessions", candidate.getString("session"));
      const template = activeTemplate(app, key, resolveLocale(details));
      const dedupeKey = candidate.getString("dedupe_key");
      const [event, source, change] = dedupeKey.split(":");
      const bookingNotice = key === "booking_confirmed" || key === "waitlist_promoted" || key === "class_reminder";
      const booking = bookingNotice && source && event === key ? relatedRecord(app, "bookings", source) : undefined;
      const obsolete = (bookingNotice && session && session.getString("status") !== "scheduled") ||
        (bookingNotice && event === key && booking?.getString("status") !== "booked") ||
        (key === "class_cancelled" && change === "change" && session?.getString("status") !== "scheduled") ||
        (key === "class_reminder" && session && Date.parse(session.getString("starts_at").replace(" ", "T")) <= now.getTime());
      const context = obsolete ? undefined : serviceContext(app, key, session, dedupeKey);
      const eligible = isEligible(details, key);
      const log = claimRetry(app, candidate.id, now, eligible && !!template && !!context);
      if (log && template && context) {
        deliver(app, log, client, template, () => ({ ...clientVariables(client), ...context(template.locale) }));
      }
    } catch {
      app.logger().error("No se pudo reintentar el mensaje.", "message_log", candidate.id);
    }
  }
}
