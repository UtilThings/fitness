/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const staff = '@request.auth.collectionName = "admins" && @request.auth.active = true && (@request.auth.role = "owner" || @request.auth.role = "reception")';
  const relation = (name, collection, required = false) => ({
    name, type: "relation", collectionId: app.findCollectionByNameOrId(collection).id,
    maxSelect: 1, required, cascadeDelete: false,
  });
  return app.save(new Collection({
    type: "base",
    name: "payments",
    listRule: staff,
    viewRule: staff,
    fields: [
      relation("client", "clients", true),
      relation("membership", "memberships"),
      relation("plan", "plans"),
      { name: "amount_cents", type: "number", min: 1, onlyInt: true, required: true },
      { name: "method", type: "select", values: ["cash", "zelle", "card", "other"], maxSelect: 1 },
      { name: "status", type: "select", values: ["pending", "paid", "void"], maxSelect: 1, required: true },
      { name: "due_on", type: "date" },
      { name: "paid_at", type: "date" },
      { name: "receipt_number", type: "text" },
      { name: "note", type: "text" },
      relation("recorded_by", "admins", true),
      { name: "period_index", type: "number", min: 0, onlyInt: true },
      { name: "void_reason", type: "text" },
      { name: "voided_at", type: "date" },
      relation("voided_by", "admins"),
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_payments_receipt_number ON payments (receipt_number) WHERE receipt_number != ''",
      "CREATE UNIQUE INDEX idx_payments_membership_period ON payments (membership, period_index) WHERE membership != '' AND status != 'void'",
      "CREATE INDEX idx_payments_status_due_on ON payments (status, due_on)",
      "CREATE INDEX idx_payments_client ON payments (client)",
    ],
  }));
}, (app) => app.delete(app.findCollectionByNameOrId("payments")));
