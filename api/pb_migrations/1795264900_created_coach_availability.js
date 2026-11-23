/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const staff = '@request.auth.collectionName = "admins" && @request.auth.active = true';
  const ownerOrCoach = '(@request.auth.role = "owner" || (@request.auth.role = "coach" && coach = @request.auth.id))';
  const editor = staff + ' && ' + ownerOrCoach;
  const pattern = "^([01][0-9]|2[0-3]):[0-5][0-9]$";

  return app.save(new Collection({
    type: "base",
    name: "coach_availability",
    listRule: staff,
    viewRule: staff,
    createRule: staff + ' && (@request.auth.role = "owner" || (@request.auth.role = "coach" && @request.body.coach = @request.auth.id))',
    updateRule: editor + ' && (@request.auth.role = "owner" || @request.body.coach:changed = false)',
    deleteRule: editor,
    fields: [
      { name: "coach", type: "relation", collectionId: app.findCollectionByNameOrId("admins").id, maxSelect: 1, required: true, cascadeDelete: false },
      { name: "weekday", type: "number", onlyInt: true, min: 0, max: 6 },
      { name: "start_time", type: "text", required: true, pattern },
      { name: "end_time", type: "text", required: true, pattern },
    ],
    indexes: ["CREATE INDEX idx_coach_availability_weekday ON coach_availability (coach, weekday)"],
  }));
}, (app) => app.delete(app.findCollectionByNameOrId("coach_availability")));
