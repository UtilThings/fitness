/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const staff = '@request.auth.collectionName = "admins" && @request.auth.active = true';
  return app.save(new Collection({
    type: "base",
    name: "message_logs",
    listRule: staff,
    viewRule: staff,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "client", type: "relation", required: true, maxSelect: 1, collectionId: app.findCollectionByNameOrId("clients").id },
      { name: "session", type: "relation", maxSelect: 1, collectionId: app.findCollectionByNameOrId("class_sessions").id },
      { name: "template_key", type: "select", required: true, maxSelect: 1, values: [
        "booking_confirmed", "class_reminder", "class_cancelled", "waitlist_promoted",
        "payment_due", "membership_renewal", "manual",
      ] },
      { name: "channel", type: "select", required: true, maxSelect: 1, values: ["email"] },
      { name: "status", type: "select", required: true, maxSelect: 1, values: ["sent", "failed"] },
      { name: "error", type: "text", max: 200 },
      { name: "created", type: "autodate", onCreate: true },
      { name: "attempts", type: "number", required: true, onlyInt: true, min: 1 },
      { name: "next_retry_at", type: "date" },
      { name: "dedupe_key", type: "text" },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_message_logs_dedupe ON message_logs (dedupe_key) WHERE dedupe_key != ''",
      "CREATE INDEX idx_message_logs_retry ON message_logs (status, next_retry_at)",
      "CREATE INDEX idx_message_logs_created ON message_logs (created)",
    ],
  }));
}, (app) => app.delete(app.findCollectionByNameOrId("message_logs")));
