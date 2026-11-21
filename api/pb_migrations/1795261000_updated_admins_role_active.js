/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const admins = app.findCollectionByNameOrId("admins");

  if (!admins.fields.getByName("role")) {
    admins.fields.add(new Field({
      name: "role",
      type: "select",
      values: ["owner", "coach", "reception"],
      maxSelect: 1,
    }));
  }

  if (!admins.fields.getByName("active")) {
    admins.fields.add(new Field({ name: "active", type: "bool" }));
  }

  app.save(admins);

  for (const admin of app.findAllRecords(admins)) {
    admin.set("role", "owner");
    admin.set("active", true);
    app.save(admin);
  }

  admins.fields.getByName("role").required = true;
  return app.save(admins);
}, (app) => {
  const admins = app.findCollectionByNameOrId("admins");
  admins.fields.removeByName("role");
  admins.fields.removeByName("active");
  return app.save(admins);
});
