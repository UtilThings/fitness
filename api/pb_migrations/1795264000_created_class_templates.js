/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const staff = '@request.auth.collectionName = "admins" && @request.auth.active = true';
  const owner = staff + ' && @request.auth.role = "owner"';

  return app.save(new Collection({
    type: "base",
    name: "class_templates",
    listRule: staff,
    viewRule: staff,
    createRule: owner,
    updateRule: owner,
    deleteRule: owner,
    fields: [
      { name: "service", type: "relation", collectionId: app.findCollectionByNameOrId("services").id, maxSelect: 1, required: true, cascadeDelete: false },
      { name: "weekday", type: "number", onlyInt: true, min: 0, max: 6 },
      { name: "start_time", type: "text", required: true, pattern: "^([01][0-9]|2[0-3]):[0-5][0-9]$" },
      { name: "duration_min", type: "number", onlyInt: true, min: 15, max: 240 },
      { name: "coach", type: "relation", collectionId: app.findCollectionByNameOrId("admins").id, maxSelect: 1, cascadeDelete: false },
      { name: "capacity", type: "number", onlyInt: true, min: 1 },
      { name: "active", type: "bool" },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_templates_slot ON class_templates (service, weekday, start_time)",
    ],
  }));
}, (app) => app.delete(app.findCollectionByNameOrId("class_templates")));
