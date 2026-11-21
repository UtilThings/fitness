/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const admins = app.findCollectionByNameOrId("admins");
  const ownerRule = '@request.auth.collectionName = "admins" && @request.auth.active = true && @request.auth.role = "owner"';

  return app.save(new Collection({
    type: "base",
    name: "audit_logs",
    listRule: ownerRule,
    viewRule: ownerRule,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "actor", type: "relation", collectionId: admins.id, maxSelect: 1, cascadeDelete: false },
      { name: "action", type: "select", values: ["create", "update", "delete", "custom"], maxSelect: 1, required: true },
      { name: "collection", type: "text", required: true },
      { name: "record_id", type: "text", required: true },
      { name: "summary", type: "text" },
      { name: "diff", type: "json" },
      { name: "created", type: "autodate", onCreate: true },
    ],
    indexes: [
      'CREATE INDEX idx_audit_logs_record ON audit_logs ("collection", record_id)',
      'CREATE INDEX idx_audit_logs_created ON audit_logs (created)',
    ],
  }));
}, (app) => {
  return app.delete(app.findCollectionByNameOrId("audit_logs"));
});
