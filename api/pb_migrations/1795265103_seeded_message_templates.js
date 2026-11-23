/// <reference path="../pb_data/types.d.ts" />

function defaults() {
  return [
    ["booking_confirmed", "es", "Reserva confirmada: {{class_name}}", "Hola {{client_first_name}},\n\nTu reserva para {{class_name}} está confirmada para el {{class_date}} a las {{class_time}}.\n\n{{studio_name}}"],
    ["booking_confirmed", "en", "Booking confirmed: {{class_name}}", "Hi {{client_first_name}},\n\nYour booking for {{class_name}} is confirmed for {{class_date}} at {{class_time}}.\n\n{{studio_name}}"],
    ["class_reminder", "es", "Recordatorio: {{class_name}}", "Hola {{client_first_name}},\n\nTe esperamos en {{class_name}} el {{class_date}} a las {{class_time}}.\n\n{{studio_name}}"],
    ["class_reminder", "en", "Reminder: {{class_name}}", "Hi {{client_first_name}},\n\nWe look forward to seeing you at {{class_name}} on {{class_date}} at {{class_time}}.\n\n{{studio_name}}"],
    ["class_cancelled", "es", "Aviso sobre tu clase: {{class_name}}", "Hola {{client_first_name}},\n\nHay una novedad sobre {{class_name}}, {{class_date}} a las {{class_time}}.\n{{cancel_reason}}\n\n{{studio_name}}"],
    ["class_cancelled", "en", "Class update: {{class_name}}", "Hi {{client_first_name}},\n\nThere is an update about {{class_name}}, {{class_date}} at {{class_time}}.\n{{cancel_reason}}\n\n{{studio_name}}"],
    ["waitlist_promoted", "es", "Cupo asignado: {{class_name}}", "Hola {{client_first_name}},\n\nTu reserva desde la lista de espera está confirmada para {{class_name}} el {{class_date}} a las {{class_time}}.\n\n{{studio_name}}"],
    ["waitlist_promoted", "en", "Spot available: {{class_name}}", "Hi {{client_first_name}},\n\nYour waitlist booking is now confirmed for {{class_name}} on {{class_date}} at {{class_time}}.\n\n{{studio_name}}"],
    ["payment_due", "es", "Próximo vencimiento: {{plan_name}}", "Hola {{client_first_name}},\n\nEl pago de {{amount}} por {{plan_name}} vence el {{due_date}}.\n\n{{studio_name}}"],
    ["payment_due", "en", "Upcoming payment: {{plan_name}}", "Hi {{client_first_name}},\n\nYour payment of {{amount}} for {{plan_name}} is due on {{due_date}}.\n\n{{studio_name}}"],
    ["membership_renewal", "es", "Aviso de renovación: {{plan_name}}", "Hola {{client_first_name}},\n\nEl periodo de {{plan_name}} termina el {{period_end}}. Importe de renovación: {{amount}}.\n\n{{studio_name}}"],
    ["membership_renewal", "en", "Renewal notice: {{plan_name}}", "Hi {{client_first_name}},\n\nYour current {{plan_name}} period ends on {{period_end}}. Renewal amount: {{amount}}.\n\n{{studio_name}}"],
  ].map(([key, locale, subject, body], index) => ({
    prefix: "msg018seed" + String(index).padStart(2, "0"),
    key, locale, subject, body, active: true,
  }));
}

migrate((app) => {
  const collection = app.findCollectionByNameOrId("message_templates");
  for (const template of defaults()) {
    const { key, locale } = template;
    const existing = app.findRecordsByFilter(collection, "key = {:key} && locale = {:locale}", "", 1, 0, { key, locale });
    if (existing.length) continue;
    const { prefix, ...fields } = template;
    // An edited seed can still occupy its original ID after a partial rollback.
    for (let suffix = 0; suffix < 1000; suffix++) {
      const id = prefix + String(suffix).padStart(3, "0");
      if (app.findRecordsByFilter(collection, "id = {:id}", "", 1, 0, { id }).length) continue;
      app.save(new Record(collection, { id, ...fields }));
      break;
    }
  }
}, (app) => {
  for (const template of defaults()) {
    const [record] = app.findRecordsByFilter("message_templates",
      "id ~ {:prefix} && key = {:key} && locale = {:locale} && subject = {:subject} && body = {:body} && active = true",
      "", 1, 0, template);
    if (record && record.id.startsWith(template.prefix)) app.delete(record);
  }
});
