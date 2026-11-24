import { classVariables, relatedRecord } from "./message-context";
import { isMessageKey, renderTemplate, validateTemplate, type Locale, type Template, type Variables } from "./message-render";
import { sendManualMessage, sendTestMessage } from "./message-send";
import { tenantRecord } from "./tenant";
import { requireBookingStaff } from "./booking-store";

function readLocale(value: unknown): Locale | undefined {
  if (value === undefined || value === "") return;
  if (value === "es" || value === "en") return value;
  throw new BadRequestError("Elige español o inglés.");
}

function inputTemplate(body: Record<string, unknown>, override?: "manual"): Template {
  return {
    key: override ?? (typeof body.key === "string" ? body.key : ""),
    subject: typeof body.subject === "string" ? body.subject : "",
    body: typeof body.body === "string" ? body.body : "",
  };
}

function sampleVariables(locale: Locale): Variables {
  const english = locale === "en";
  return {
    client_first_name: english ? "Alex" : "Ana",
    studio_name: $os.getenv("STUDIO_NAME").trim() || "JQ Fitness",
    studio_phone: $os.getenv("STUDIO_PHONE").trim(),
    class_name: english ? "Strength class" : "Clase de fuerza",
    class_date: english ? "Sat, Nov 21" : "sáb 21 nov",
    class_time: "9:00 AM",
    coach_name: "Andrea",
    cancel_reason: english ? "Schedule change" : "Cambio de horario",
    plan_name: english ? "Monthly plan" : "Plan mensual",
    amount: "$268.00",
    due_date: english ? "Tue, Nov 24" : "mar 24 nov",
    period_end: english ? "Mon, Nov 30" : "lun 30 nov",
  };
}

function problemsResponse(e: core.RequestEvent, problems: ReturnType<typeof validateTemplate>) {
  const unknown_variables = [...new Set(problems.flatMap(({ variable }) => variable ? [variable] : []))];
  return e.json(400, { status: 400, message: "La plantilla es inválida.", problems, unknown_variables });
}

export function previewMessage(e: core.RequestEvent) {
  requireBookingStaff(e);
  const body = e.requestInfo().body;
  const locale = readLocale(body.locale) ?? "es";
  const template = inputTemplate(body);
  const problems = validateTemplate(template);
  if (problems.length) return problemsResponse(e, problems);
  return e.json(200, { ...renderTemplate(template, sampleVariables(locale)), unknown_variables: [] });
}

export function messageClass(e: core.RequestEvent) {
  requireBookingStaff(e);
  const body = e.requestInfo().body;
  const locale = readLocale(body.locale);
  const template = inputTemplate(body, "manual");
  const problems = validateTemplate(template);
  if (problems.length) return problemsResponse(e, problems);

  const session = tenantRecord(e.app, "class_sessions", e.request?.pathValue("sessionId") ?? "", e.auth!.getString("business"));
  if (!session) throw new NotFoundError("No se encontró la clase.");
  if (session.getString("status") !== "scheduled" || Date.parse(session.getString("starts_at").replace(" ", "T")) <= Date.now()) {
    throw new BadRequestError("Selecciona una clase próxima y programada.");
  }
  const bookings = e.app.findRecordsByFilter("bookings",
    "session = {:id} && (status = 'booked' || status = 'waitlisted')", "id", 201, 0, { id: session.id });
  if (bookings.length > 200) throw new BadRequestError("El envío admite hasta 200 destinatarios.");

  const results = { sent: 0, failed: 0, skipped: 0 };
  const contexts = new Map<Locale, Variables>();
  for (const booking of bookings) {
    if (!booking) continue;
    const client = relatedRecord(e.app, "clients", booking.getString("client"));
    if (!client) {
      results.skipped++;
      continue;
    }
    const result = sendManualMessage(e.app, {
      client, template, session: session.id, locale,
      context: (language) => {
        const vars = contexts.get(language) ?? classVariables(e.app, session, language);
        contexts.set(language, vars);
        return vars;
      },
    });
    results[result]++;
  }
  return e.json(200, results);
}

export function testMessage(e: core.RequestEvent) {
  requireBookingStaff(e);
  if (e.auth!.getString("role") !== "owner") throw new ForbiddenError("Solo el owner puede enviar correos de prueba.");
  const body = e.requestInfo().body;
  const locale = readLocale(body.locale) ?? "es";
  let template = inputTemplate(body);
  if (!isMessageKey(template.key) || template.key === "manual") {
    throw new BadRequestError("Selecciona una plantilla operativa.");
  }
  if (body.subject === undefined && body.body === undefined) {
    const [saved] = e.app.findRecordsByFilter("message_templates", "business = {:business} && key = {:key} && locale = {:locale}", "", 1, 0, {
      business: e.auth!.getString("business"), key: template.key, locale,
    });
    if (!saved) throw new NotFoundError("No se encontró la plantilla.");
    template = { key: template.key, subject: saved.getString("subject"), body: saved.getString("body") };
  }
  const problems = validateTemplate(template);
  if (problems.length) return problemsResponse(e, problems);

  const { smtp, meta } = e.app.settings();
  if (!smtp.enabled || !smtp.host || !meta.senderAddress) throw new BadRequestError("El correo no está configurado");
  try {
    sendTestMessage(e.app, e.auth!.email(), template, sampleVariables(locale));
  } catch {
    throw new BadRequestError("No se pudo enviar el correo de prueba.");
  }
  return e.json(200, { sent: true });
}
