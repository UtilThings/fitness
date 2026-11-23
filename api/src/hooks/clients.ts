/// <reference path="../../pb_data/types.d.ts" />

onRecordsListRequest((e) => {
  if (!e.auth) throw new NotFoundError();
  return e.next();
}, "clients");

// PocketBase select fields have no configurable default.
onRecordCreate((e) => {
  if (!e.record!.getString("status")) e.record!.set("status", "active");
  if (e.record!.collection().fields.getByName("locale") && !e.record!.getString("locale")) {
    e.record!.set("locale", "es");
  }
  return e.next();
}, "clients");

routerUse((e) => {
  const request = e.request;
  const nameOrId = request?.pathValue("collection");
  if (request?.method !== "DELETE" || !nameOrId || !request.pathValue("id")) return e.next();

  let clients;
  try {
    clients = e.app.findCachedCollectionByNameOrId("clients");
  } catch {
    return e.next();
  }
  if ([clients.name, clients.id].includes(nameOrId.toLowerCase())) {
    const actor = e.auth;
    if (actor?.collection().name !== "admins" || !actor.getBool("active") || actor.getString("role") !== "owner") {
      throw new ForbiddenError("Solo el owner puede eliminar clientes.");
    }
  }
  return e.next();
});

onRecordCreateRequest((e) => {
  const { validateClientRequest } = require(`${__hooks}/lib/client-request`) as typeof import("../lib/client-request");
  return validateClientRequest(e, e.record!.original());
}, "clients");

onRecordUpdateRequest((e) => {
  const { validateClientRequest } = require(`${__hooks}/lib/client-request`) as typeof import("../lib/client-request");
  const app = e.app;
  try {
    return app.runInTransaction((tx) => {
      e.app = tx;
      const current = tx.findRecordById("clients", e.record!.id);
      // Reject a stale write when it could overwrite the class mark or bypass a state transition.
      const loaded = e.record!.original();
      if (["free_class_used", "status"].some((field) => loaded.getString(field) !== current.getString(field))) {
        throw new ApiError(409, "El cliente cambió. Vuelve a abrir el perfil antes de guardar.", {});
      }
      return validateClientRequest(e, current);
    });
  } finally {
    e.app = app;
  }
}, "clients");

onRecordDeleteRequest((e) => {
  const app = e.app;
  try {
    return app.runInTransaction((tx) => {
      e.app = tx;
      const client = e.record!;
      for (const name of ["bookings", "memberships", "payments", "coaching_programs", "message_logs"]) {
        let collection;
        try {
          collection = tx.findCollectionByNameOrId(name);
        } catch {
          continue;
        }
        const relation = collection.fields.getByName("client");
        if (relation?.type() !== "relation" || relation.collectionId !== client.collection().id) continue;
        const [related] = tx.findRecordsByFilter(collection, "client ?= {:id}", "", 1, 0, { id: client.id });
        if (related) throw new ApiError(409, "El cliente tiene historial; inactívalo en su lugar", {});
      }

      return e.next();
    });
  } finally {
    e.app = app;
  }
}, "clients");
