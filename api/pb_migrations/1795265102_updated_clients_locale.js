/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const clients = app.findCollectionByNameOrId("clients");
  clients.fields.add(new SelectField({ name: "locale", maxSelect: 1, values: ["es", "en"] }));
  app.save(clients);
  app.db().newQuery("UPDATE clients SET locale = 'es' WHERE locale = ''").execute();
}, (app) => {
  const clients = app.findCollectionByNameOrId("clients");
  clients.fields.removeByName("locale");
  app.save(clients);
});
