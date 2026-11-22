/// <reference path="../../pb_data/types.d.ts" />

import { blockRangeUtc, generateSessions, SESSION_WINDOW_WEEKS, sessionKey, type ScheduleBlockDates } from "./schedule-gen";
import { addLocalDays, startOfLocalDay, utcToLocal } from "./tz";
import { buildEntry } from "./audit";
import { validateCancelReason } from "./session-rules";

export function fieldError(field: string, message: string) {
  return new BadRequestError(message, { [field]: new ValidationError("validation_schedule", message) });
}

export function getRecord(app: core.App, collection: string, id: string) {
  const [record] = app.findRecordsByFilter(collection, "id = {:id}", "", 1, 0, { id });
  return record;
}

export function auditActor(record: core.Record, actor: string) {
  record.set("@pbInternalAuditActor", actor);
}

export function validateCoach(app: core.App, id: string) {
  if (!id) return;
  const coach = getRecord(app, "admins", id);
  if (!coach?.getBool("active") || !["coach", "owner"].includes(coach.getString("role"))) {
    throw fieldError("coach", "Elige un coach activo.");
  }
}

export function blockDates(record: core.Record): ScheduleBlockDates {
  return { date_from: record.getString("date_from"), date_to: record.getString("date_to") };
}

export function scheduledInRange(app: core.App, range: { from: string; to: string }) {
  return app.findRecordsByFilter("class_sessions",
    "status = 'scheduled' && starts_at >= {:from} && starts_at < {:to}",
    "starts_at,id", 0, 0, {
      from: pocketBaseDate(range.from), to: pocketBaseDate(range.to),
    }).filter((record): record is core.Record => !!record);
}

export function pocketBaseDate(iso: string) {
  return iso.replace("T", " ");
}

export function scheduleAudit(app: core.App, collection: string, recordId: string, actorId: string,
  summary: string, counts: Record<string, number>) {
  const data = buildEntry({ action: "custom", collection, recordId: recordId || app.findCollectionByNameOrId(collection).id, actorId, after: counts });
  if (data) {
    app.save(new Record(app.findCollectionByNameOrId("audit_logs"), { ...data, summary }));
  }
}

export function cancelBlockedSessions(app: core.App, block: core.Record) {
  const actor = block.getString("@pbInternalAuditActor");
  const affected = scheduledInRange(app, blockRangeUtc(blockDates(block)));
  for (const session of affected) {
    session.set("status", "cancelled");
    session.set("cancel_reason", "Bloqueo: " + block.getString("title"));
    auditActor(session, actor);
    app.save(session);
  }
  scheduleAudit(app, "schedule_blocks", block.id, actor,
    "Sesiones canceladas por bloqueo: " + affected.length, { cancelled: affected.length });
}

export function persistGeneratedSessions(app: core.App, options: {
  from?: string;
  weeks?: number;
  template?: string;
  actor?: string;
} = {}) {
  const from = options.from ?? utcToLocal(new Date().toISOString()).date;
  const weeks = options.weeks ?? SESSION_WINDOW_WEEKS;
  const end = addLocalDays(from, weeks * 7);
  let created = 0;
  let skippedExisting = 0;
  let skippedBlocked = 0;

  // A single writer takes the snapshot and inserts the generated rows.
  app.runInTransaction((tx) => {
    const templates = tx.findRecordsByFilter("class_templates",
      options.template ? "active = true && id = {:id}" : "active = true", "", 0, 0,
      options.template ? { id: options.template } : {}).flatMap((record) => record ? [{
        id: record.id, service: record.getString("service"), weekday: record.getInt("weekday"),
        start_time: record.getString("start_time"), duration_min: record.getInt("duration_min"),
        capacity: record.getInt("capacity"), coach: record.getString("coach"), active: true,
      }] : []);
    const assignable = new Set(tx.findRecordsByFilter("admins",
      "active = true && (role = 'owner' || role = 'coach')", "").map((record) => record?.id));
    for (const template of templates) {
      if (!assignable.has(template.coach)) template.coach = "";
    }
    const services = new Map(tx.findRecordsByFilter("services", "active = true", "").flatMap((record) => {
      if (!record) return [];
      const coach = record.getString("default_coach");
      return [[record.id, { active: true, default_coach: assignable.has(coach) ? coach : "" }] as const];
    }));
    const blocks = tx.findRecordsByFilter("schedule_blocks",
      "date_from < {:end} && date_to >= {:from}", "", 0, 0, { from, end })
      .flatMap((record) => record ? [blockDates(record)] : []);
    const existingKeys = new Set(tx.findRecordsByFilter("class_sessions",
      "template != '' && starts_at >= {:from} && starts_at < {:to}", "", 0, 0, {
        from: pocketBaseDate(startOfLocalDay(from)), to: pocketBaseDate(startOfLocalDay(end)),
      }).flatMap((record) => record ? [sessionKey(record.getString("template"), record.getString("starts_at"))] : []));
    const result = generateSessions({ templates, services, blocks, from, weeks, existingKeys });
    skippedExisting = result.skippedExisting;
    skippedBlocked = result.skippedBlocked;
    const collection = tx.findCollectionByNameOrId("class_sessions");
    for (const input of result.toCreate) {
      const record = new Record(collection, input);
      auditActor(record, options.actor ?? "");
      try {
        tx.save(record);
        created++;
      } catch (error) {
        if (!String(error).includes("UNIQUE constraint failed: class_sessions.template, class_sessions.starts_at")) {
          throw error;
        }
        skippedExisting++;
      }
    }
  });

  return {
    created, skipped_existing: skippedExisting, skipped_blocked: skippedBlocked,
    window: { from, to: addLocalDays(end, -1) },
  };
}

export function getReason(reason: unknown): string {
  const error = validateCancelReason(reason);
  if (error) throw fieldError("reason", error);
  return (reason as string).trim();
}

export function requireScheduleRole(event: core.RequestEvent, roles: string[]): string {
  const actor = event.auth;
  if (!actor?.getBool("active") || !roles.includes(actor.getString("role"))) {
    throw new ForbiddenError("Tu rol no permite esta operación.");
  }
  return actor.id;
}

export function hasCoachConflict(app: core.App, id: string, coach: string, startsAt: string, duration: number): boolean {
  if (!coach) return false;
  const start = Date.parse(startsAt);
  const end = new Date(start + duration * 60_000).toISOString();
  const earliest = new Date(start - 240 * 60_000).toISOString();
  return app.findRecordsByFilter("class_sessions",
    "coach = {:coach} && status = 'scheduled' && id != {:id} && starts_at > {:earliest} && starts_at < {:end}",
    "", 0, 0, { id, coach, earliest: pocketBaseDate(earliest), end: pocketBaseDate(end) }
  ).some((record) => {
    if (!record) return false;
    const otherStart = Date.parse(record.getString("starts_at").replace(" ", "T"));
    return otherStart + record.getInt("duration_min") * 60_000 > start;
  });
}

export function inScheduleTransaction<T>(app: core.App, operation: (tx: core.App) => T): T {
  let result!: T;
  app.runInTransaction((tx) => {
    result = operation(tx);
  });
  return result;
}
