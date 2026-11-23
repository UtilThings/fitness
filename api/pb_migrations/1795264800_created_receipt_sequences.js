/// <reference path="../pb_data/types.d.ts" />

migrate((app) => app.save(new Collection({
  type: "base",
  name: "receipt_sequences",
  fields: [
    { name: "year", type: "number", min: 1, max: 9999, onlyInt: true, required: true },
    { name: "last_seq", type: "number", min: 0, max: 999999, onlyInt: true },
  ],
  indexes: ["CREATE UNIQUE INDEX idx_receipt_sequences_year ON receipt_sequences (year)"],
})), (app) => app.delete(app.findCollectionByNameOrId("receipt_sequences")));
