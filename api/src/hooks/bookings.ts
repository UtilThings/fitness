/// <reference path="../../pb_data/types.d.ts" />

onRecordsListRequest((e) => {
  if (!e.auth) throw new NotFoundError();
  return e.next();
}, "bookings");

// Select fields use a model hook for their default.
onRecordCreate((e) => {
  if (!e.record!.getString("status")) e.record!.set("status", "booked");
  return e.next();
}, "bookings");
