/// <reference path="../../pb_data/types.d.ts" />

function validateSchedulingWrite(e: core.RecordEvent) {
  const { validateAvailabilityRecord, validateSessionRecord } =
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
      else validateSessionRecord(tx, record);
      return e.next();
    });
  } finally {
    e.app = app;
  }
}

// Model hooks cover requests, schedule routes and internal writes with the same transaction.
onRecordCreate(validateSchedulingWrite, "coach_availability", "class_sessions");
onRecordUpdate(validateSchedulingWrite, "coach_availability", "class_sessions");
