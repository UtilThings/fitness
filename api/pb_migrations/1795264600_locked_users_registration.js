/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const users = app.findCollectionByNameOrId("_pb_users_auth_");
  if (String(users.createRule) !== "") return;
  users.createRule = null;
  return app.save(users);
}, (app) => {
  const users = app.findCollectionByNameOrId("_pb_users_auth_");
  if (users.createRule !== null) return;
  users.createRule = "";
  return app.save(users);
});
