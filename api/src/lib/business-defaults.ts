/// <reference path="../../pb_data/types.d.ts" />

const DEFAULT_TEMPLATES = [
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
] as const;

export function seedBusinessDefaults(app: core.App, businessId: string) {
  const collection = app.findCollectionByNameOrId("message_templates");
  for (const [key, locale, subject, body] of DEFAULT_TEMPLATES) {
    const existing = app.findRecordsByFilter(collection,
      "business = {:business} && key = {:key} && locale = {:locale}", "", 1, 0,
      { business: businessId, key, locale });
    if (!existing.length) {
      app.save(new Record(collection, { business: businessId, key, locale, subject, body, active: true }));
    }
  }
}
