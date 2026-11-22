/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const staff = '@request.auth.collectionName = "admins" && @request.auth.active = true';
  const owner = staff + ' && @request.auth.role = "owner"';
  const datePattern = "^[0-9]{4}-[0-9]{2}-[0-9]{2}$";

  return app.save(new Collection({
    type: "base",
    name: "schedule_blocks",
    listRule: staff,
    viewRule: staff,
    createRule: owner,
    updateRule: owner,
    deleteRule: owner,
    fields: [
      { name: "title", type: "text", required: true, max: 80 },
      { name: "date_from", type: "text", required: true, pattern: datePattern },
      { name: "date_to", type: "text", required: true, pattern: datePattern },
      { name: "reason", type: "text", max: 200 },
    ],
    indexes: [
      "CREATE INDEX idx_blocks_dates ON schedule_blocks (date_from, date_to)",
    ],
  }));
}, (app) => app.delete(app.findCollectionByNameOrId("schedule_blocks")));
