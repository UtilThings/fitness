/// <reference path="../../pb_data/types.d.ts" />

// Routes require an active admin. Bad input uses field errors (400), role
// restrictions use 403 and unknown records use 404.
routerAdd("POST", "/api/admin/sessions/generate", (e) => {
  const { fieldError, persistGeneratedSessions, requireScheduleRole, scheduleAudit, inScheduleTransaction } =
    require(`${__hooks}/lib/schedule-store`) as typeof import("../lib/schedule-store");
  const { addLocalDays, startOfLocalDay } = require(`${__hooks}/lib/tz`) as typeof import("../lib/tz");
  const actor = requireScheduleRole(e, ["owner"]);
  const { from, weeks } = e.requestInfo().body;
  if (weeks !== undefined && (typeof weeks !== "number" || !Number.isInteger(weeks) || weeks < 1 || weeks > 12)) {
    throw fieldError("weeks", "Indica entre 1 y 12 semanas.");
  }
  if (from !== undefined) {
    try {
      if (typeof from !== "string") throw new RangeError();
      startOfLocalDay(addLocalDays(from, (Number(weeks) || 4) * 7));
    } catch {
      throw fieldError("from", "Indica una fecha local válida en formato YYYY-MM-DD.");
    }
  }
  const result = inScheduleTransaction(e.app, (tx) => {
    const generated = persistGeneratedSessions(tx, { weeks, from, actor });
    const { created, skipped_existing, skipped_blocked } = generated;
    scheduleAudit(tx, "class_sessions", "", actor, "Sesiones generadas: " + created,
      { created, skipped_existing, skipped_blocked });
    return generated;
  });
  return e.json(200, result);
}, $apis.requireAuth("admins"));

cronAdd("jq_generate_sessions", "0 7 * * *", () => {
  const { persistGeneratedSessions, scheduleAudit } =
    require(`${__hooks}/lib/schedule-store`) as typeof import("../lib/schedule-store");
  $app.runInTransaction((tx) => {
    const { created, skipped_existing, skipped_blocked } = persistGeneratedSessions(tx);
    scheduleAudit(tx, "class_sessions", "", "", "Sesiones generadas por cron: " + created,
      { created, skipped_existing, skipped_blocked });
  });
});

routerAdd("POST", "/api/admin/sessions/{id}/cancel", (e) => {
  const { auditActor, getRecord, getReason, requireScheduleRole, scheduleAudit, inScheduleTransaction } =
    require(`${__hooks}/lib/schedule-store`) as typeof import("../lib/schedule-store");
  const actor = requireScheduleRole(e, ["owner", "reception"]);
  const id = e.request.pathValue("id");
  const reason = getReason(e.requestInfo().body.reason);
  const session = inScheduleTransaction(e.app, (tx) => {
    const record = getRecord(tx, "class_sessions", id);
    if (!record) throw new NotFoundError("Sesión no encontrada.");
    if (record.getString("status") !== "scheduled") throw new BadRequestError("La sesión no se puede cancelar.");
    record.set("status", "cancelled");
    record.set("cancel_reason", reason);
    auditActor(record, actor);
    tx.save(record);
    scheduleAudit(tx, "class_sessions", id, actor, "Sesión cancelada", { cancelled: 1 });
    return record;
  });
  return e.json(200, session);
}, $apis.requireAuth("admins"));

routerAdd("POST", "/api/admin/sessions/{id}/move", (e) => {
  const { auditActor, blockDates, fieldError, getRecord, getReason, hasCoachConflict, requireScheduleRole,
    scheduleAudit, validateCoach, inScheduleTransaction } = require(`${__hooks}/lib/schedule-store`) as typeof import("../lib/schedule-store");
  const { validateMove } = require(`${__hooks}/lib/session-rules`) as typeof import("../lib/session-rules");
  const { isBlocked } = require(`${__hooks}/lib/schedule-gen`) as typeof import("../lib/schedule-gen");
  const { utcToLocal } = require(`${__hooks}/lib/tz`) as typeof import("../lib/tz");
  const actor = requireScheduleRole(e, ["owner", "reception"]);
  const id = e.request.pathValue("id");
  const body = e.requestInfo().body;
  const reason = getReason(body.reason);
  const startsAt = body.starts_at;
  const now = Date.now();
  const invalid = validateMove({ startsAt, now });
  if (invalid) throw fieldError("starts_at", invalid);

  const result = inScheduleTransaction(e.app, (tx) => {
    const original = getRecord(tx, "class_sessions", id);
    if (!original) throw new NotFoundError("Sesión no encontrada.");
    if (original.getString("status") !== "scheduled") throw new BadRequestError("La sesión no se puede cancelar.");
    const coach = body.coach === undefined ? original.getString("coach") : body.coach;
    if (typeof coach !== "string") throw fieldError("coach", "Selecciona un coach válido.");
    validateCoach(tx, coach);
    const date = utcToLocal(startsAt).date;
    const blocks = tx.findRecordsByFilter("schedule_blocks", "date_from <= {:date} && date_to >= {:date}",
      "", 0, 0, { date }).flatMap((block) => block ? [blockDates(block)] : []);
    const duration = original.getInt("duration_min");
    const blocked = isBlocked(date, blocks);
    const conflict = hasCoachConflict(tx, id, coach, startsAt, duration);
    const error = validateMove({ startsAt, now, blocked, conflict });
    if (error) throw fieldError("starts_at", error);

    original.set("status", "cancelled");
    original.set("cancel_reason", "Movida: " + Array.from(reason).slice(0, 192).join(""));
    auditActor(original, actor);
    tx.save(original);

    const created = new Record(original.collection(), {
      service: original.getString("service"), starts_at: startsAt, duration_min: duration,
      capacity: original.getInt("capacity"), coach, kind: "special", status: "scheduled",
      notes: "Movida desde la sesión " + id,
    });
    auditActor(created, actor);
    tx.save(created);
    scheduleAudit(tx, "class_sessions", id, actor, "Sesión movida a " + created.id, { cancelled: 1, created: 1 });
    return { cancelled: original, created };
  });
  return e.json(200, result);
}, $apis.requireAuth("admins"));

routerAdd("POST", "/api/admin/class-templates/{id}/assign-coach", (e) => {
  const { auditActor, fieldError, getRecord, pocketBaseDate, requireScheduleRole, scheduleAudit, inScheduleTransaction, validateCoach } =
    require(`${__hooks}/lib/schedule-store`) as typeof import("../lib/schedule-store");
  const actor = requireScheduleRole(e, ["owner"]);
  const id = e.request.pathValue("id");
  const { coach, apply_to_future } = e.requestInfo().body;
  if (typeof coach !== "string") throw fieldError("coach", "Selecciona un coach válido.");
  if (apply_to_future !== undefined && typeof apply_to_future !== "boolean") {
    throw fieldError("apply_to_future", "Indica si quieres actualizar las sesiones futuras.");
  }
  const result = inScheduleTransaction(e.app, (tx) => {
    const template = getRecord(tx, "class_templates", id);
    if (!template) throw new NotFoundError("Plantilla no encontrada.");
    validateCoach(tx, coach);
    template.set("coach", coach);
    auditActor(template, actor);
    tx.save(template);
    let updated = 0;
    if (apply_to_future) {
      const future = tx.findRecordsByFilter("class_sessions",
        "template = {:id} && status = 'scheduled' && starts_at > {:now} && coach != {:coach}",
        "", 0, 0, { id, now: pocketBaseDate(new Date().toISOString()), coach });
      for (const session of future) {
        if (!session) continue;
        session.set("coach", coach);
        auditActor(session, actor);
        tx.save(session);
        updated++;
      }
    }
    scheduleAudit(tx, "class_templates", id, actor, "Sesiones reasignadas: " + updated, { updated_sessions: updated });
    return { template, updated_sessions: updated };
  });
  return e.json(200, result);
}, $apis.requireAuth("admins"));
