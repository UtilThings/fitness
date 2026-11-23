/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const staff = '@request.auth.collectionName = "admins" && @request.auth.active = true';
  const manager = '@request.auth.role = "owner" || @request.auth.role = "reception"';
  const coach = '@request.auth.role = "coach"';

  return app.save(new Collection({
    type: "base",
    name: "coaching_programs",
    listRule: staff,
    viewRule: staff,
    createRule: staff + ' && (' + manager + ' || (' + coach + ' && @request.body.coach = @request.auth.id))',
    updateRule: staff + ' && (' + manager + ' || (' + coach + ' && coach = @request.auth.id && @request.body.coach:changed = false))',
    deleteRule: staff + ' && @request.auth.role = "owner"',
    fields: [
      { name: "client", type: "relation", collectionId: app.findCollectionByNameOrId("clients").id, maxSelect: 1, required: true, cascadeDelete: false },
      { name: "coach", type: "relation", collectionId: app.findCollectionByNameOrId("admins").id, maxSelect: 1, required: true, cascadeDelete: false },
      { name: "membership", type: "relation", collectionId: app.findCollectionByNameOrId("memberships").id, maxSelect: 1, cascadeDelete: false },
      { name: "status", type: "select", values: ["active", "paused", "ended"], maxSelect: 1, required: true },
      { name: "starts_on", type: "date", required: true },
      { name: "renews_on", type: "date" },
      { name: "duration_weeks", type: "number", onlyInt: true, min: 8, max: 16, required: true },
      { name: "goal", type: "text" },
      { name: "program_url", type: "url" },
      { name: "notes", type: "text" },
    ],
    indexes: [
      "CREATE INDEX idx_coaching_programs_renewal ON coaching_programs (status, renews_on)",
      "CREATE INDEX idx_coaching_programs_coach_status ON coaching_programs (coach, status)",
      "CREATE INDEX idx_coaching_programs_client ON coaching_programs (client)",
      "CREATE UNIQUE INDEX idx_coaching_programs_live_client ON coaching_programs (client) WHERE status IN ('active','paused')",
    ],
  }));
}, (app) => app.delete(app.findCollectionByNameOrId("coaching_programs")));
