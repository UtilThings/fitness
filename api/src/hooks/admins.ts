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
