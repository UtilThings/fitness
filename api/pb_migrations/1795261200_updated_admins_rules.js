/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const admins = app.findCollectionByNameOrId("admins");
  admins.listRule = '@request.auth.collectionName = "admins" && @request.auth.active = true';
  admins.viewRule = '@request.auth.collectionName = "admins" && @request.auth.active = true';
  admins.createRule = '@request.auth.collectionName = "admins" && @request.auth.active = true && @request.auth.role = "owner"';
  admins.updateRule = '(@request.auth.collectionName = "admins" && @request.auth.active = true && @request.auth.role = "owner") || (@request.auth.collectionName = "admins" && @request.auth.active = true && id = @request.auth.id && @request.body.role:isset = false && @request.body.active:isset = false)';
  admins.deleteRule = '(@request.auth.collectionName = "admins" && @request.auth.active = true && @request.auth.role = "owner") && id != @request.auth.id';
  admins.authRule = "active = true";
  return app.save(admins);
}, (app) => {
  const admins = app.findCollectionByNameOrId("admins");
  admins.listRule = "id = @request.auth.id";
  admins.viewRule = "id = @request.auth.id";
  admins.createRule = "";
  admins.updateRule = "id = @request.auth.id";
  admins.deleteRule = "id = @request.auth.id";
  admins.authRule = "";
  return app.save(admins);
});
