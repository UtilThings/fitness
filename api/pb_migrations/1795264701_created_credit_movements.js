/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const staff = '@request.auth.collectionName = "admins" && @request.auth.active = true';
  return app.save(new Collection({
    type: "base",
    name: "credit_movements",
    listRule: staff,
    viewRule: staff,
    fields: [
      { name: "membership", type: "relation", collectionId: app.findCollectionByNameOrId("memberships").id, maxSelect: 1, required: true },
      { name: "booking", type: "relation", collectionId: app.findCollectionByNameOrId("bookings").id, maxSelect: 1 },
      { name: "delta", type: "number", onlyInt: true, required: true },
      { name: "reason", type: "select", values: ["grant", "attend", "late_cancel", "adjust", "expire"], maxSelect: 1, required: true },
      { name: "note", type: "text" },
      { name: "created", type: "autodate", onCreate: true },
      { name: "created_by", type: "relation", collectionId: app.findCollectionByNameOrId("admins").id, maxSelect: 1 },
    ],
    indexes: [
      "CREATE INDEX idx_credit_movements_membership_created ON credit_movements (membership, created)",
      "CREATE INDEX idx_credit_movements_booking ON credit_movements (booking)",
    ],
  }));
}, (app) => app.delete(app.findCollectionByNameOrId("credit_movements")));
