/// <reference path="../../pb_data/types.d.ts" />

onRecordCreateRequest((e) => {
  const body = e.requestInfo().body;
  if (body.active === undefined) e.record!.set("active", true);
  if (body.duration_min === undefined) e.record!.set("duration_min", 60);
  return e.next();
}, "class_templates");

onRecordValidate((e) => {
  const { fieldError, getRecord, validateCoach } = require(`${__hooks}/lib/schedule-store`) as typeof import("../lib/schedule-store");
  const record = e.record!;
  const service = getRecord(e.app, "services", record.getString("service"));
  if (!service?.getBool("active")) throw fieldError("service", "Selecciona un servicio activo.");
  validateCoach(e.app, record.getString("coach"));
  if (record.getFloat("capacity") < 1) throw fieldError("capacity", "El cupo debe ser al menos 1.");
  return e.next();
}, "class_templates");

onRecordUpdateRequest((e) => {
  if (e.auth?.getString("role") === "owner" || e.hasSuperuserAuth()) {
    e.record!.set("@pbInternalScheduleOwner", true);
  }
  return e.next();
}, "class_sessions");

onRecordValidate((e) => {
  const { canTransition, validateCancelReason } = require(`${__hooks}/lib/session-rules`) as typeof import("../lib/session-rules");
  const { fieldError, validateCoach } = require(`${__hooks}/lib/schedule-store`) as typeof import("../lib/schedule-store");
  const record = e.record!;
  const previous = record.original();
  const creating = record.isNew();
  if (creating) {
    if (!record.getString("status")) record.set("status", "scheduled");
    if (!record.getString("kind")) record.set("kind", "regular");
  }
  const from = previous.getString("status") || "scheduled";
  const to = record.getString("status");
  const role = record.getBool("@pbInternalScheduleOwner") ? "owner" : "";
  if (!canTransition(from, to, role)) throw fieldError("status", "La transición de estado no está permitida.");
  if (from === "completed" && !creating) {
    for (const field of ["template", "service", "starts_at"]) {
      if (previous.getString(field) !== record.getString(field)) {
        throw fieldError(field, "Este dato está fijo en una sesión completada.");
      }
    }
  }
  if (to === "cancelled") {
    const reason = record.getString("cancel_reason").trim();
    const error = validateCancelReason(reason);
    if (error) throw fieldError("cancel_reason", error);
    record.set("cancel_reason", reason);
  } else {
    record.set("cancel_reason", "");
  }
  if (creating || record.getString("coach") !== previous.getString("coach")) {
    validateCoach(e.app, record.getString("coach"));
  }
  return e.next();
}, "class_sessions");

onRecordValidate((e) => {
  const { blockDates, fieldError } = require(`${__hooks}/lib/schedule-store`) as typeof import("../lib/schedule-store");
  const { startOfLocalDay } = require(`${__hooks}/lib/tz`) as typeof import("../lib/tz");
  const { getBusinessTimezone } = require(`${__hooks}/lib/tenant`) as typeof import("../lib/tenant");
  const timezone = getBusinessTimezone(e.app, e.record!.getString("business"));
  const block = blockDates(e.record!);
  for (const field of ["date_from", "date_to"] as const) {
    try {
      startOfLocalDay(block[field], timezone);
    } catch {
      throw fieldError(field, "Indica una fecha válida.");
    }
  }
  if (block.date_to < block.date_from) {
    throw fieldError("date_to", "La fecha final debe ser igual o posterior a la inicial.");
  }
  return e.next();
}, "schedule_blocks");

function saveScheduleInTransaction(e: core.RecordEvent) {
  const { cancelBlockedSessions, persistGeneratedSessions } = require(`${__hooks}/lib/schedule-store`) as typeof import("../lib/schedule-store");
  const app = e.app;
  try {
    return app.runInTransaction((tx) => {
      e.app = tx;
      const record = e.record!;
      const name = record.collection().name;
      const activate = name === "class_templates" && record.getBool("active") &&
        !record.getBool("@pbInternalScheduleSkipGeneration") &&
        (record.isNew() || !tx.findRecordById(name, record.id).getBool("active"));
      e.next();
      // Persist the change and its cascades together. After-success events run at commit.
      if (name === "schedule_blocks") cancelBlockedSessions(tx, record);
      if (activate) {
        persistGeneratedSessions(tx, {
          business: record.getString("business"), template: record.id, actor: record.getString("@pbInternalAuditActor"),
        });
      }
    });
  } finally {
    e.app = app;
  }
}

onRecordCreate(saveScheduleInTransaction, "class_templates", "schedule_blocks");
onRecordUpdate(saveScheduleInTransaction, "class_templates", "schedule_blocks");

onRecordDelete((e) => {
  const app = e.app;
  try {
    return app.runInTransaction((tx) => {
      e.app = tx;
      if (tx.countRecords("class_sessions", $dbx.hashExp({ template: e.record!.id }))) {
        throw new BadRequestError("La plantilla tiene sesiones. Desactívala en su lugar.");
      }
      return e.next();
    });
  } finally {
    e.app = app;
  }
}, "class_templates");
