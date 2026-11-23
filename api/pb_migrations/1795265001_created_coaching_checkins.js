/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const staff = '@request.auth.collectionName = "admins" && @request.auth.active = true';
  const owner = '@request.auth.role = "owner"';
  const coach = '@request.auth.role = "coach" && program.coach = @request.auth.id';

  return app.save(new Collection({
    type: "base",
    name: "coaching_checkins",
    listRule: staff,
    viewRule: staff,
    createRule: staff + ' && (' + owner + ' || (' + coach + '))',
    updateRule: staff + ' && (' + owner + ' || (' + coach + ' && @request.body.program:changed = false))',
    deleteRule: staff + ' && ' + owner,
    fields: [
      { name: "program", type: "relation", collectionId: app.findCollectionByNameOrId("coaching_programs").id, maxSelect: 1, required: true, cascadeDelete: false },
      { name: "checked_at", type: "date", required: true },
      { name: "adherence", type: "number", onlyInt: true, min: 1, max: 5, required: true },
      { name: "notes", type: "text" },
      { name: "created", type: "autodate", onCreate: true },
      { name: "created_by", type: "relation", collectionId: app.findCollectionByNameOrId("admins").id, maxSelect: 1, cascadeDelete: false },
    ],
    indexes: ["CREATE INDEX idx_coaching_checkins_program_date ON coaching_checkins (program, checked_at)"],
  }));
}, (app) => app.delete(app.findCollectionByNameOrId("coaching_checkins")));
