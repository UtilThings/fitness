/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const staff = '@request.auth.collectionName = "admins" && @request.auth.active = true';
  const owner = staff + ' && @request.auth.role = "owner"';

  return app.save(new Collection({
    type: "base",
    name: "clients",
    listRule: staff,
    viewRule: staff,
    createRule: staff,
    updateRule: staff,
    deleteRule: owner,
    fields: [
      { name: "first_name", type: "text", required: true, max: 80 },
      { name: "last_name", type: "text", required: true, max: 80 },
      { name: "email", type: "email" },
      { name: "phone", type: "text", max: 16 },
      { name: "status", type: "select", required: true, maxSelect: 1, values: ["active", "paused", "inactive"] },
      { name: "goals", type: "text", max: 2000 },
      { name: "notes", type: "text", max: 4000 },
      { name: "assessment", type: "json" },
      { name: "free_class_used", type: "bool" },
      { name: "joined_on", type: "date" },
      { name: "emergency_contact", type: "text", max: 200 },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_clients_email ON clients (email) WHERE email != ''",
      "CREATE INDEX idx_clients_status ON clients (status)",
      "CREATE INDEX idx_clients_last_name ON clients (last_name)",
      "CREATE INDEX idx_clients_phone ON clients (phone)",
    ],
  }));
}, (app) => app.delete(app.findCollectionByNameOrId("clients")));
