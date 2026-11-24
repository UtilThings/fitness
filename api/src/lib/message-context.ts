import { getBusiness, getBusinessTimezone, tenantRecord } from "./tenant";
import { formatDate, formatMoneyCents, formatTime, type Locale, type ServiceKey, type Variables } from "./message-render";

type MessageLookup = Pick<core.App, "findRecordsByFilter">;

export function getBusinessContext(app: MessageLookup, business: string) {
  const record = getBusiness(app, business);
  if (!record) throw new NotFoundError("No se encontró el negocio.");
  return {
    name: record.getString("name"), phone: record.getString("phone"),
    email: record.getString("email"), city: record.getString("city"),
    currency: record.getString("currency"), timezone: record.getString("timezone"),
  };
}

export function businessVariables(context: { name: string; phone: string }): Variables {
  return { studio_name: context.name, studio_phone: context.phone };
}

export function messageDedupeKey(business: string, event: string) {
  return event ? `${business}:${event}` : "";
}

export function messageEventKey(business: string, stored: string) {
  const prefix = business + ":";
  return stored.startsWith(prefix) ? stored.slice(prefix.length) : stored;
}

export function classVariables(app: MessageLookup, session: core.Record, locale: Locale): Variables {
  const business = session.getString("business");
  const timezone = getBusinessTimezone(app, business);
  const start = session.getString("starts_at");
  const service = tenantRecord(app, "services", session.getString("service"), business);
  const coach = tenantRecord(app, "admins", session.getString("coach"), business);
  return {
    class_name: session.getString("title") || service?.getString("name") || (locale === "es" ? "Clase" : "Class"),
    class_date: formatDate(start, locale, timezone),
    class_time: formatTime(start, timezone),
    coach_name: coach?.getString("name") || "",
  };
}

export function serviceContext(app: MessageLookup, key: ServiceKey, session: core.Record | undefined, dedupeKey: string, business: string) {
  if (session) {
    return (locale: Locale): Variables => {
      const vars = classVariables(app, session, locale);
      if (key === "class_cancelled") {
        const cancelled = session.getString("status") === "cancelled";
        const reason = session.getString("cancel_reason");
        vars.cancel_reason = cancelled
          ? (locale === "es" ? "La clase se canceló." : "The class was cancelled.") + (reason ? " " + reason : "")
          : (locale === "es" ? "La clase cambió de horario o de coach." : "The class time or coach has changed.");
      }
      return vars;
    };
  }
  const [, source, date] = dedupeKey.split(":");
  const payment = key === "payment_due";
  if ((payment || key === "membership_renewal") && source && date) {
    const record = tenantRecord(app, payment ? "payments" : "memberships", source, business);
    const dateField = payment ? "due_on" : "current_period_end";
    if (!record || record.getString("status") !== (payment ? "pending" : "active") ||
        record.getString(dateField).slice(0, 10) !== date) return;
    const plan = tenantRecord(app, "plans", record.getString("plan"), business);
    const { currency, timezone } = getBusinessContext(app, business);
    return (locale: Locale): Variables => ({
      plan_name: plan?.getString("name") || (locale === "es" ? "tu servicio" : "your service"),
      amount: formatMoneyCents(payment ? record.getInt("amount_cents") : plan?.getInt("price_cents") ?? 0, currency),
      [payment ? "due_date" : "period_end"]: formatDate(date, locale, timezone),
    });
  }
}
