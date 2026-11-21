/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const admins = app.findCollectionByNameOrId("admins");

  if (!admins.fields.getByName("phone")) {
    admins.fields.add(new Field({
      name: "phone",
      type: "text",
      max: 30,
      pattern: "^[0-9+()\\-\\s.]*$",
    }));
  }
  if (!admins.fields.getByName("bio")) {
    admins.fields.add(new Field({ name: "bio", type: "text", max: 600 }));
  }

  return app.save(admins);
}, (app) => {
  const admins = app.findCollectionByNameOrId("admins");
  admins.fields.removeByName("phone");
  admins.fields.removeByName("bio");
  return app.save(admins);
});
