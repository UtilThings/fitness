/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const admins = app.findCollectionByNameOrId("admins");
  admins.fields.getByName("avatar").protected = true;
  admins.viewRule += " && business.active = true";
  app.save(admins);
}, (app) => {
  const admins = app.findCollectionByNameOrId("admins");
  admins.fields.getByName("avatar").protected = false;
  admins.viewRule = admins.viewRule.replace(/ && business\.active = true$/, "");
  app.save(admins);
});
