/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const staff = '@request.auth.collectionName = "admins" && @request.auth.active = true';
  return app.save(new Collection({
    type: "base",
    name: "memberships",
    listRule: staff,
    viewRule: staff,
    fields: [
      { name: "client", type: "relation", collectionId: app.findCollectionByNameOrId("clients").id, maxSelect: 1, required: true, cascadeDelete: false },
      { name: "plan", type: "relation", collectionId: app.findCollectionByNameOrId("plans").id, maxSelect: 1, required: true, cascadeDelete: false },
      { name: "status", type: "select", values: ["active", "paused", "expired", "cancelled"], maxSelect: 1, required: true },
      { name: "starts_on", type: "date", required: true },
      { name: "current_period_start", type: "date", required: true },
      { name: "current_period_end", type: "date", required: true },
      { name: "periods_paid", type: "number", min: 0, onlyInt: true },
      { name: "commitment_periods_total", type: "number", min: 0, onlyInt: true },
      { name: "credits_balance", type: "number", onlyInt: true },
      { name: "auto_renew", type: "bool" },
      { name: "paused_at", type: "date" },
      { name: "notes", type: "text" },
      { name: "ended_on", type: "date" },
    ],
    indexes: [
      "CREATE INDEX idx_memberships_client_status ON memberships (client, status)",
      "CREATE INDEX idx_memberships_period_end ON memberships (current_period_end)",
      "CREATE UNIQUE INDEX idx_memberships_live_plan ON memberships (client, plan) WHERE status IN ('active','paused')",
    ],
  }));
}, (app) => app.delete(app.findCollectionByNameOrId("memberships")));
