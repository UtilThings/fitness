/// <reference path="../../pb_data/types.d.ts" />

onRecordsListRequest((e) => {
  if (!e.auth) throw new NotFoundError();
  return e.next();
}, "clients");

// PocketBase select fields have no configurable default.
onRecordCreate((e) => {
  if (!e.record!.getString("status")) e.record!.set("status", "active");
  return e.next();
}, "clients");
