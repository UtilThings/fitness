/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const services = app.findCollectionByNameOrId("services");
  const staff = '@request.auth.collectionName = "admins" && @request.auth.active = true';
  const owner = staff + ' && @request.auth.role = "owner"';

  return app.save(new Collection({
    type: "base",
    name: "plans",
    listRule: staff,
    viewRule: staff,
    createRule: owner,
    updateRule: owner,
    deleteRule: owner,
    fields: [
      { name: "service", type: "relation", collectionId: services.id, maxSelect: 1, required: true, cascadeDelete: false },
      { name: "name", type: "text", required: true, max: 80 },
      // PocketBase treats zero as empty for required number fields.
      { name: "price_cents", type: "number", min: 0, onlyInt: true },
      { name: "billing_unit", type: "select", required: true, maxSelect: 1, values: ["per_4_weeks", "per_class", "first_visit"] },
      { name: "sessions", type: "number", min: 0, onlyInt: true },
      { name: "per_week", type: "number", min: 0, max: 7, onlyInt: true },
      { name: "commitment_periods", type: "number", min: 0, onlyInt: true },
      { name: "is_first_class", type: "bool" },
      { name: "partner", type: "bool" },
      { name: "note", type: "text", max: 300 },
      { name: "active", type: "bool" },
      { name: "sort", type: "number", min: 0, onlyInt: true },
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_plans_service_name ON plans (service, name)",
      "CREATE INDEX idx_plans_service_active_sort ON plans (service, active, sort)",
    ],
  }));
}, (app) => {
  return app.delete(app.findCollectionByNameOrId("plans"));
});
