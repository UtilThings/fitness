/// <reference path="../../pb_data/types.d.ts" />

onRecordCreateRequest((e) => {
  // Only the request can distinguish an omitted boolean from explicit false.
  if (!Object.prototype.hasOwnProperty.call(e.requestInfo().body, "active")) {
    e.record?.set("active", true);
  }
  return e.next();
}, "admins");

onRecordCreate((e) => {
  if (!e.record.getString("role")) {
    e.record.set("role", "coach");
  }
  return e.next();
}, "admins");

routerUse((request) => {
  const collection = request.request.pathValue("collection").toLowerCase();
  if (request.auth || request.request.method !== "POST" || !collection
    || !request.request.url?.path.endsWith("/records")) {
    return request.next();
  }

  // PocketBase otherwise returns 400 for a failed nonempty create rule.
  const admins = request.app.findCachedCollectionByNameOrId("admins");
  if (String(admins.createRule) && (collection === admins.name || collection === admins.id)) {
    throw new ForbiddenError("Only owners can create admins.");
  }
  return request.next();
});

onRecordUpdateRequest((e) => {
  const record = e.record;
  if (record && e.auth?.collection().name === "admins" && e.auth.id === record.id) {
    const original = record.original();
    if (record.getString("role") !== original.getString("role")
      || record.getBool("active") !== original.getBool("active")) {
      throw new ForbiddenError("Admins cannot change their own role or active status.");
    }
  }
  return e.next();
}, "admins");
