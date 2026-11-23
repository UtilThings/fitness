import { formatDate, formatMoneyCents, formatTime, type Locale, type ServiceKey, type Variables } from "./message-render";

export function relatedRecord(app: core.App, collection: string, id: string): core.Record | undefined {
  if (!id) return;
  return app.findRecordsByFilter(collection, "id = {:id}", "", 1, 0, { id })[0];
}

export function classVariables(app: core.App, session: core.Record, locale: Locale): Variables {
  const start = session.getString("starts_at");
  const service = relatedRecord(app, "services", session.getString("service"));
  const coach = relatedRecord(app, "admins", session.getString("coach"));
  return {
    class_name: session.getString("title") || service?.getString("name") || (locale === "es" ? "Clase" : "Class"),
    class_date: formatDate(start, locale),
    class_time: formatTime(start),
    coach_name: coach?.getString("name") || "",
  };
}

export function serviceContext(app: core.App, key: ServiceKey, session: core.Record | undefined, dedupeKey: string) {
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
    const record = relatedRecord(app, payment ? "payments" : "memberships", source);
    const dateField = payment ? "due_on" : "current_period_end";
    if (!record || record.getString("status") !== (payment ? "pending" : "active") ||
        record.getString(dateField).slice(0, 10) !== date) return;
    const plan = relatedRecord(app, "plans", record.getString("plan"));
    return (locale: Locale): Variables => ({
      plan_name: plan?.getString("name") || (locale === "es" ? "tu servicio" : "your service"),
      amount: formatMoneyCents(payment ? record.getInt("amount_cents") : plan?.getInt("price_cents") ?? 0),
      [payment ? "due_date" : "period_end"]: formatDate(date, locale),
    });
  }
}
