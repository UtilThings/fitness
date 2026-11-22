/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const admins = app.findCollectionByNameOrId("admins");
  const staff = '@request.auth.collectionName = "admins" && @request.auth.active = true';
  const owner = staff + ' && @request.auth.role = "owner"';

  return app.save(new Collection({
    type: "base",
    name: "services",
    listRule: staff,
    viewRule: staff,
    createRule: owner,
    updateRule: owner,
    deleteRule: owner,
    fields: [
      { name: "name", type: "text", required: true, max: 80 },
      { name: "slug", type: "text", required: true, pattern: "^[a-z0-9]+(-[a-z0-9]+)*$" },
      { name: "kind", type: "select", required: true, maxSelect: 1, values: ["group", "personal", "online"] },
      { name: "description", type: "text", max: 500 },
      { name: "capacity", type: "number", onlyInt: true, min: 0 },
      { name: "default_coach", type: "relation", collectionId: admins.id, maxSelect: 1, cascadeDelete: false },
      { name: "cancellation_hours", type: "number", onlyInt: true, min: 0, max: 168 },
      { name: "active", type: "bool" },
      { name: "sort", type: "number", onlyInt: true, min: 0 },
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_services_slug ON services (slug)",
      "CREATE INDEX idx_services_active_sort ON services (active, sort)",
    ],
  }));
}, (app) => {
  const collection = app.findAllCollections("base").find((item) => item.name === "services");
  if (collection) {
    return app.delete(collection);
  }
});
