/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const payments = app.findCollectionByNameOrId("payments");
  payments.fields.add(new SelectField({ name: "currency", maxSelect: 1, values: ["USD", "EUR", "MXN", "COP", "CRC", "GBP"] }));
  app.save(payments);
  app.db().newQuery("UPDATE payments SET currency = (SELECT currency FROM businesses WHERE id = payments.business)").execute();
  payments.fields.getByName("currency").required = true;
  app.save(payments);
}, (app) => {
  const payments = app.findCollectionByNameOrId("payments");
  payments.fields.removeByName("currency");
  app.save(payments);
});
