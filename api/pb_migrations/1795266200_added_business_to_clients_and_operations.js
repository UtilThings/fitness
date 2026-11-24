/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const businesses = app.findCollectionByNameOrId("businesses");
  const business = app.findFirstRecordByData("businesses", "slug", "jq-fitness");
  const collections = ["clients", "bookings", "memberships", "credit_movements", "receipt_sequences", "payments", "coaching_programs", "coaching_checkins"];
  const indexes = {
    "clients": [
      "idx_clients_email",
      "email",
      "business, email",
      "email != ''"
    ],
    "receipt_sequences": [
      "idx_receipt_sequences_year",
      "year",
      "business, year",
      ""
    ],
    "payments": [
      "idx_payments_receipt_number",
      "receipt_number",
      "business, receipt_number",
      "receipt_number != ''"
    ]
  };
  for (const name of collections) {
    const collection = app.findCollectionByNameOrId(name);
    collection.fields.add(new RelationField({ name: "business", collectionId: businesses.id, maxSelect: 1, cascadeDelete: false }));
    app.save(collection);

    app.db().update(name, { business: business.id }, $dbx.hashExp({ business: "" })).execute();
    collection.fields.getByName("business").required = true;
    collection.addIndex(`idx_${name}_business`, false, "business", "");
    if (indexes[name]) {
      const [index, , columns, where] = indexes[name];
      collection.removeIndex(index);
      collection.addIndex(index, true, columns, where);
    }
    app.save(collection);
  }
}, (app) => {
  const collections = ["clients", "bookings", "memberships", "credit_movements", "receipt_sequences", "payments", "coaching_programs", "coaching_checkins"];
  const indexes = {
    "clients": [
      "idx_clients_email",
      "email",
      "business, email",
      "email != ''"
    ],
    "receipt_sequences": [
      "idx_receipt_sequences_year",
      "year",
      "business, year",
      ""
    ],
    "payments": [
      "idx_payments_receipt_number",
      "receipt_number",
      "business, receipt_number",
      "receipt_number != ''"
    ]
  };
  for (const name of collections) {
    const collection = app.findCollectionByNameOrId(name);
    collection.removeIndex(`idx_${name}_business`);
    if (indexes[name]) {
      const [index, oldColumns, , where] = indexes[name];
      collection.removeIndex(index);
      collection.addIndex(index, true, oldColumns, where);
    }
    collection.fields.removeByName("business");
    app.save(collection);
  }
});
