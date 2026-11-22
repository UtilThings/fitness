/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const staff = '@request.auth.collectionName = "admins" && @request.auth.active = true';
  return app.save(new Collection({
    type: "base",
    name: "bookings",
    listRule: staff,
    viewRule: staff,
    createRule: staff,
    updateRule: staff,
    deleteRule: staff + ' && @request.auth.role = "owner"',
    fields: [
      { name: "session", type: "relation", required: true, maxSelect: 1, collectionId: app.findCollectionByNameOrId("class_sessions").id },
      { name: "client", type: "relation", required: true, maxSelect: 1, collectionId: app.findCollectionByNameOrId("clients").id },
      { name: "status", type: "select", required: true, maxSelect: 1, values: ["booked", "waitlisted", "cancelled", "late_cancelled", "attended", "no_show"] },
      { name: "waitlist_position", type: "number", min: 0, onlyInt: true },
      { name: "cancelled_at", type: "date" },
      { name: "marked_by", type: "relation", maxSelect: 1, collectionId: app.findCollectionByNameOrId("admins").id },
      { name: "source", type: "select", required: true, maxSelect: 1, values: ["admin"] },
      { name: "override_note", type: "text", max: 500 },
      { name: "free_class", type: "bool" },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_bookings_session_client ON bookings (session, client)",
      "CREATE INDEX idx_bookings_session_status ON bookings (session, status)",
      "CREATE INDEX idx_bookings_client ON bookings (client)",
    ],
  }));
}, (app) => app.delete(app.findCollectionByNameOrId("bookings")));
