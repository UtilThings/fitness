/// <reference path="../../pb_data/types.d.ts" />

function validateCoachingProgram(e: core.RecordRequestEvent) {
  const { validateProgramInput } = require(`${__hooks}/lib/coaching`) as typeof import("../lib/coaching");
  const { addDays } = require(`${__hooks}/lib/membership-cycles`) as typeof import("../lib/membership-cycles");
  const { getRecord } = require(`${__hooks}/lib/schedule-store`) as typeof import("../lib/schedule-store");
  const record = e.record!;
  const app = e.app;
  try {
    return app.runInTransaction((tx) => {
      e.app = tx;
      const previous = record.isNew() ? null : getRecord(tx, "coaching_programs", record.id);
      const original = record.original();
      if (!record.isNew() && (!previous || record.collection().fields.fieldNames()
        .some((field) => previous.getString(field) !== original.getString(field)))) {
        throw new ApiError(409, "El registro cambió. Recarga los datos antes de guardar.");
      }
      const status = record.getString("status");
      const coachId = record.getString("coach");
      const clientId = record.getString("client");
      const membershipId = record.getString("membership");
      const errors = validateProgramInput({
        status, starts_on: record.getString("starts_on").slice(0, 10),
        duration_weeks: record.getFloat("duration_weeks"),
      });
      if (previous?.getString("status") === "ended" && status !== "ended") {
        errors.status = "Un programa finalizado no puede reabrirse.";
      }
      const coach = getRecord(tx, "admins", coachId);
      if (!coach?.getBool("active") || !["coach", "owner"].includes(coach.getString("role"))) {
        errors.coach = "Selecciona un coach activo.";
      }
      if (e.auth?.getString("role") === "coach"
        && (coachId !== e.auth.id || (previous && previous.getString("coach") !== e.auth.id))) {
        throw new ForbiddenError("Solo puedes modificar tus propios programas.");
      }
      const membership = getRecord(tx, "memberships", membershipId);
      const plan = membership && getRecord(tx, "plans", membership.getString("plan"));
      const service = plan && getRecord(tx, "services", plan.getString("service"));
      const relink = !previous || previous.getString("membership") !== membershipId || previous.getString("client") !== clientId;
      const activate = previous?.getString("status") !== "active" && status === "active";

      if (!membership || membership.getString("client") !== clientId || service?.getString("kind") !== "online"
        || ((relink || activate) && membership.getString("status") !== "active")) {
        errors.membership = "Selecciona una membresía online activa del cliente.";
      }
      if (Object.keys(errors).length) {
        throw new BadRequestError("Revisa los datos del programa.", Object.fromEntries(
          Object.entries(errors).map(([field, message]) => [field, new ValidationError("validation_coaching", message)]),
        ));
      }
      record.set("renews_on", relink
        ? addDays(membership!.getString("current_period_end").slice(0, 10), 1)
        : previous!.getString("renews_on"));
      return e.next();
    });
  } finally {
    e.app = app;
  }
}

onRecordCreateRequest(validateCoachingProgram, "coaching_programs");
onRecordUpdateRequest(validateCoachingProgram, "coaching_programs");

function validateCoachingCheckin(e: core.RecordRequestEvent) {
  const { validateCheckin } = require(`${__hooks}/lib/coaching`) as typeof import("../lib/coaching");
  const { getRecord } = require(`${__hooks}/lib/schedule-store`) as typeof import("../lib/schedule-store");
  const { utcToLocal } = require(`${__hooks}/lib/tz`) as typeof import("../lib/tz");
  const record = e.record!;
  const app = e.app;
  try {
    return app.runInTransaction((tx) => {
      e.app = tx;
      const program = getRecord(tx, "coaching_programs", record.getString("program"));
      const previous = record.isNew() ? null : getRecord(tx, "coaching_checkins", record.id);
      const original = record.original();
      if (!record.isNew() && (!previous || record.collection().fields.fieldNames()
        .some((field) => previous.getString(field) !== original.getString(field)))) {
        throw new ApiError(409, "El registro cambió. Recarga los datos antes de guardar.");
      }
      if (e.auth?.getString("role") === "coach" && (program?.getString("coach") !== e.auth.id
        || (previous && previous.getString("program") !== program?.id))) {
        throw new ForbiddenError("Solo puedes registrar check-ins en tus propios programas.");
      }
      const today = utcToLocal(new Date().toISOString()).date;
      const errors = validateCheckin({
        checked_at: record.getString("checked_at").slice(0, 10), adherence: record.getFloat("adherence"),
      }, { status: program?.getString("status") ?? "" }, today);
      if (!program) errors.program = "Selecciona un programa válido.";
      if (Object.keys(errors).length) {
        throw new BadRequestError("Revisa los datos del check-in.", Object.fromEntries(
          Object.entries(errors).map(([field, message]) => [field, new ValidationError("validation_coaching", message)]),
        ));
      }
      record.set("created_by", previous
        ? previous.getString("created_by")
        : e.auth?.collection().name === "admins" ? e.auth.id : "");
      return e.next();
    });
  } finally {
    e.app = app;
  }
}

onRecordCreateRequest(validateCoachingCheckin, "coaching_checkins");
onRecordUpdateRequest(validateCoachingCheckin, "coaching_checkins");

onRecordUpdate((e) => {
  const membership = e.record!;
  const before = membership.original();
  const periodChanged = before.getString("current_period_end") !== membership.getString("current_period_end");
  const statusChanged = before.getString("status") !== membership.getString("status");
  if (!periodChanged && !statusChanged) return e.next();

  const { addDays } = require(`${__hooks}/lib/membership-cycles`) as typeof import("../lib/membership-cycles");
  const app = e.app;
  try {
    return app.runInTransaction((tx) => {
      e.app = tx;
      // Keep both writes in one transaction so a failed sync also rolls back the membership.
      e.next();
      const status = membership.getString("status");
      const end = membership.getString("current_period_end").slice(0, 10);
      const programs = tx.findRecordsByFilter(
        "coaching_programs", "membership = {:id} && status != 'ended'", "", 0, 0, { id: membership.id },
      );
      for (const program of programs) {
        if (!program) continue;
        const currentStatus = program.getString("status");
        const currentRenewal = program.getString("renews_on").slice(0, 10);
        if (end && periodChanged) program.set("renews_on", addDays(end, 1));
        if (statusChanged) {
          if (status === "cancelled") program.set("status", "ended");
          if (status === "active" || status === "paused") program.set("status", status);
        }
        if (program.getString("status") !== currentStatus || program.getString("renews_on").slice(0, 10) !== currentRenewal) {
          program.set("@pbInternalAuditActor", membership.getString("@pbInternalAuditActor"));
          tx.save(program);
        }
      }
    });
  } finally {
    e.app = app;
  }
}, "memberships");
