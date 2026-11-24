/// <reference path="../../pb_data/types.d.ts" />

onRecordCreateRequest((e) => {
  // Only the request can distinguish an omitted boolean from explicit false.
  if (!Object.prototype.hasOwnProperty.call(e.requestInfo().body, "active")) {
    e.record?.set("active", true);
  }
  return e.next();
}, "admins");

onRecordCreate((e) => {
  if (e.record && !e.record.getString("role")) {
    e.record.set("role", "coach");
  }
  return e.next();
}, "admins");

routerUse((request) => {
  const http = request.request;
  const collection = http?.pathValue("collection");
  if (request.hasSuperuserAuth() || http?.method !== "POST" || !collection
    || http.url?.path !== `/api/collections/${collection}/records`) {
    return request.next();
  }

  // PocketBase returns 400 for a failed nonempty create rule.
  const admins = request.app.findCachedCollectionByNameOrId("admins");
  const actor = request.auth;
  if (String(admins.createRule) && [admins.name, admins.id].includes(collection.toLowerCase())
    && !(actor?.collection().name === "admins" && actor.getBool("active")
      && actor.getString("role") === "owner")) {
    throw new ForbiddenError("Solo los owners pueden crear integrantes");
  }
  return request.next();
});

onRecordUpdateRequest((e) => {
  const { checkAdminChange, countActiveOwners } = require(`${__hooks}/lib/team-guards`) as typeof import("../lib/team-guards");
  const record = e.record!;
  const original = record.original();
  const after = { id: record.id, role: record.getString("role"), active: record.getBool("active") };
  const actorId = e.auth?.collection().name === "admins" ? e.auth.id : undefined;

  // Keep the count and the mutation on the same SQLite writer transaction.
  const app = e.app;
  try {
    app.runInTransaction((txApp) => {
      e.app = txApp;
      const current = txApp.findRecordById("admins", record.id);
      const before = { id: current.id, role: current.getString("role"), active: current.getBool("active") };
      const business = current.getString("business");
      if (actorId) {
        const actor = txApp.findRecordById("admins", actorId);
        if (!actor.getBool("active") || actor.getString("business") !== business || (actorId !== record.id && actor.getString("role") !== "owner")) {
          throw new ForbiddenError("No tienes permiso para editar este integrante");
        }
      }
      if (before.role !== original.getString("role") || before.active !== original.getBool("active")) {
        throw new BadRequestError("El rol o el estado cambió. Vuelve a cargar la ficha");
      }
      if (after.role === before.role && after.active === before.active) return e.next();

      const activeOwners = countActiveOwners(txApp, business);
      const error = checkAdminChange({ before, after, actorId, activeOwners });
      if (error) throw new BadRequestError(error.message);
      if (actorId === record.id && before.role !== after.role) {
        throw new ForbiddenError("No puedes cambiar tu propio rol");
      }
      return e.next();
    });
  } finally {
    e.app = app;
  }
}, "admins");

onRecordDeleteRequest((e) => {
  const { ADMIN_REFERENCES, canDeleteAdmin, countActiveOwners } = require(`${__hooks}/lib/team-guards`) as typeof import("../lib/team-guards");
  const app = e.app;
  try {
    app.runInTransaction((txApp) => {
      e.app = txApp;
      const record = txApp.findRecordById("admins", e.record!.id);
      const business = record.getString("business");
      const isLastOwner = record.getBool("active") && record.getString("role") === "owner"
        && countActiveOwners(txApp, business) <= 1;
      const actorId = e.auth?.collection().name === "admins" ? e.auth.id : undefined;
      if (actorId) {
        const actor = txApp.findRecordById("admins", actorId);
        if (!actor.getBool("active") || actor.getString("business") !== business || actor.getString("role") !== "owner") {
          throw new ForbiddenError("No tienes permiso para eliminar integrantes");
        }
      }
      const isSelf = actorId === record.id;
      let referencesCount = 0;
      for (const { collection, field } of ADMIN_REFERENCES) {
        let related;
        try {
          related = txApp.findCollectionByNameOrId(collection);
        } catch {
          continue;
        }
        referencesCount += txApp.countRecords(related, $dbx.hashExp({ business, [field]: record.id }));
      }
      const error = canDeleteAdmin({ referencesCount, isLastOwner, isSelf });
      if (error) throw new ApiError(error.status, error.message, {});
      return e.next();
    });
  } finally {
    e.app = app;
  }
}, "admins");
