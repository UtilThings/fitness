/// <reference path="../../pb_data/types.d.ts" />

function validateSchedulingWrite(e: core.RecordEvent) {
  const { validateAvailabilityRecord, validateSessionRecord, validatePrivatePartners } =
    require(`${__hooks}/lib/scheduling-store`) as typeof import("../lib/scheduling-store");
  const app = e.app;
  const record = e.record!;
  const availability = record.collection().name === "coach_availability";
  const kind = record.getString("kind");
  const previousKind = record.original().getString("kind");
  if (!availability && ![kind, previousKind].some((kind) => kind === "private" || kind === "special")) {
    return e.next();
  }
  try {
    return app.runInTransaction((tx) => {
      e.app = tx;
      if (availability) validateAvailabilityRecord(tx, record);
      else {
        validateSessionRecord(tx, record);
        validatePrivatePartners(tx, record);
      }
      return e.next();
    });
  } finally {
    e.app = app;
  }
}

// Model hooks cover requests, schedule routes and internal writes with the same transaction.
onRecordCreate(validateSchedulingWrite, "coach_availability", "class_sessions");
onRecordUpdate(validateSchedulingWrite, "coach_availability", "class_sessions");


routerAdd("POST", "/api/admin/sessions/private", (e) => {
  const { createPrivateSession } =
    require(`${__hooks}/lib/private-sessions`) as typeof import("../lib/private-sessions");
  return e.json(200, createPrivateSession(e));
}, $apis.requireAuth("admins"));

onRecordCreateRequest((e) => {
  if (e.record!.getString("kind") !== "private") return e.next();
  const { prepareTenantCreate } = require(`${__hooks}/lib/tenant`) as typeof import("../lib/tenant");
  const { validateSessionRecord } =
    require(`${__hooks}/lib/scheduling-store`) as typeof import("../lib/scheduling-store");
  prepareTenantCreate(e);
  validateSessionRecord(e.app, e.record!);
  throw new BadRequestError("Use the private-session endpoint to schedule the session with its bookings.");
}, "class_sessions");
