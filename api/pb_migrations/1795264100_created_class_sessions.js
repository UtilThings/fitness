/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const staff = '@request.auth.collectionName = "admins" && @request.auth.active = true';
  const editor = staff + ' && (@request.auth.role = "owner" || @request.auth.role = "reception")';

  return app.save(new Collection({
    type: "base",
    name: "class_sessions",
    listRule: staff,
    viewRule: staff,
    createRule: editor,
    updateRule: editor,
    deleteRule: null,
    fields: [
      { name: "template", type: "relation", collectionId: app.findCollectionByNameOrId("class_templates").id, maxSelect: 1, cascadeDelete: false },
      { name: "service", type: "relation", collectionId: app.findCollectionByNameOrId("services").id, maxSelect: 1, required: true, cascadeDelete: false },
      { name: "starts_at", type: "date", required: true },
      { name: "duration_min", type: "number", onlyInt: true, min: 15, max: 240 },
      { name: "coach", type: "relation", collectionId: app.findCollectionByNameOrId("admins").id, maxSelect: 1, cascadeDelete: false },
      { name: "capacity", type: "number", onlyInt: true, min: 1 },
      { name: "status", type: "select", maxSelect: 1, values: ["scheduled", "cancelled", "completed"] },
      { name: "kind", type: "select", maxSelect: 1, values: ["regular", "special", "private"] },
      { name: "cancel_reason", type: "text", max: 200 },
      { name: "notes", type: "text", max: 500 },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_sessions_template_start ON class_sessions (template, starts_at) WHERE template != ''",
      "CREATE INDEX idx_sessions_start ON class_sessions (starts_at)",
      "CREATE INDEX idx_sessions_service_start ON class_sessions (service, starts_at)",
    ],
  }));
}, (app) => app.delete(app.findCollectionByNameOrId("class_sessions")));
