/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const staff = '@request.auth.collectionName = "admins" && @request.auth.active = true';
  const owner = staff + ' && @request.auth.role = "owner"';
  return app.save(new Collection({
    type: "base",
    name: "message_templates",
    listRule: staff,
    viewRule: staff,
    createRule: owner,
    updateRule: owner,
    deleteRule: owner,
    fields: [
      { name: "key", type: "select", required: true, maxSelect: 1, values: [
        "booking_confirmed", "class_reminder", "class_cancelled", "waitlist_promoted",
        "payment_due", "membership_renewal",
      ] },
      { name: "locale", type: "select", required: true, maxSelect: 1, values: ["es", "en"] },
      { name: "subject", type: "text", required: true, max: 150, pattern: "^[^\\r\\n]+$" },
      { name: "body", type: "text", required: true, max: 5000 },
      { name: "active", type: "bool" },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_message_templates_key_locale ON message_templates (key, locale)"],
  }));
}, (app) => app.delete(app.findCollectionByNameOrId("message_templates")));
