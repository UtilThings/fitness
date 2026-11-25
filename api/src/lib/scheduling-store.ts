/// <reference path="../../pb_data/types.d.ts" />

import { blockDates, fieldError, pocketBaseDate, validateCoach } from "./schedule-store";
import {
  toMinutes, validateAvailabilitySlots, validatePrivateSession, validateSpecialSession,
} from "./scheduling";
import { offsetMinutes, utcToLocal } from "./tz";
import { covers, sessionDate } from "./memberships-service";
import { getBusinessTimezone, tenantRecord } from "./tenant";
import { sessionBookings } from "./booking-store";

const messages: Record<string, string> = {
  coach_conflict: "The coach already has a session at that time.",
  outside_availability: "The session must be within the coach's available hours.",
  invalid_capacity: "The selected capacity is invalid for this session.",
  partner_required: "A session for two requires an active partner plan for each client.",
  title_required: "Enter a title for the special class.",
  block_conflict: "The session overlaps a calendar block.",
  invalid_slot: "Enter a valid time slot with an end time after its start.",
  overlapping_slots: "Time slots on the same day cannot overlap.",
};

export function schedulingError(code: string, conflictId?: string) {
  const message = messages[code];
  return new BadRequestError(message, {
    code: new ValidationError(code, message),
    ...(conflictId && { conflict_id: new ValidationError(conflictId, "Identifier of the conflicting record.") }),
  });
}

function slot(record: core.Record) {
  return {
    weekday: record.getFloat("weekday"),
    start_time: record.getString("start_time"),
    end_time: record.getString("end_time"),
  };
}

function coachSlots(app: core.App, coach: string, weekday: number, excludeId = "") {
  return app.findRecordsByFilter("coach_availability",
    "coach = {:coach} && weekday = {:weekday} && id != {:excludeId}", "", 0, 0, { coach, weekday, excludeId })
    .flatMap((record) => record ? [slot(record)] : []);
}

export function validateAvailabilityRecord(app: core.App, record: core.Record) {
  const coach = record.getString("coach");
  if (!coach) throw fieldError("coach", "Choose an active coach.");
  validateCoach(app, coach, record.getString("business"));
  const current = slot(record);
  const error = validateAvailabilitySlots([current, ...coachSlots(app, coach, current.weekday, record.id)]);
  if (error) throw schedulingError(error);
}

export function validateSessionRecord(app: core.App, record: core.Record) {
  const kind = record.getString("kind");
  const previousKind = record.original().getString("kind") || "regular";
  if (!record.isNew() && kind !== previousKind && [kind, previousKind].some((value) => value === "private" || value === "special")) {
    throw fieldError("kind", "The type of an existing session cannot be changed.");
  }
  if (kind !== "private" && kind !== "special") return;
  if (record.getString("status") === "cancelled") return;
  if (record.getString("template")) throw fieldError("template", "This session must be scheduled without a template.");

  const coach = record.getString("coach");
  const capacity = record.getFloat("capacity");
  const title = record.getString("title").trim();
  const business = record.getString("business");
  if (kind === "private") {
    const service = tenantRecord(app, "services", record.getString("service"), business);
    if (!service?.getBool("active") || service.getString("kind") !== "personal") {
      throw fieldError("service", "Select an active personal training service.");
    }
    if (!coach) throw fieldError("coach", "Choose an active coach.");
  } else {
    record.set("title", title);
  }
  if (record.getString("status") !== "completed") validateCoach(app, coach, business);

  const startMs = Date.parse(record.getString("starts_at").replace(" ", "T"));
  const durationMin = record.getFloat("duration_min");
  if (!Number.isFinite(startMs)) throw fieldError("starts_at", "Enter a valid date and time.");
  if (!Number.isInteger(durationMin) || durationMin < 15 || durationMin > 240) {
    throw fieldError("duration_min", "Enter a duration from 15 to 240 minutes.");
  }
  const minuteMs = 60_000;
  const endMs = startMs + durationMin * minuteMs;
  const timezone = getBusinessTimezone(app, business);
  const start = utcToLocal(new Date(startMs).toISOString(), timezone);
  const last = utcToLocal(new Date(endMs - 1).toISOString(), timezone);
  const checkSchedule = coach && record.getString("status") !== "completed";
  const sessions = checkSchedule ? app.findRecordsByFilter("class_sessions",
    "coach = {:coach} && status = 'scheduled' && starts_at > {:earliest} && starts_at < {:end}",
    "starts_at,id", 0, 0, {
      coach, earliest: pocketBaseDate(new Date(startMs - 240 * minuteMs).toISOString()),
      end: pocketBaseDate(new Date(endMs).toISOString()),
    }).flatMap((other) => other ? [{
      id: other.id, coach, status: other.getString("status"),
      startMs: Date.parse(other.getString("starts_at").replace(" ", "T")), durationMin: other.getInt("duration_min"),
    }] : []) : [];
  const blocks = checkSchedule ? app.findRecordsByFilter("schedule_blocks",
    "business = {:business} && date_from <= {:last} && date_to >= {:first}", "date_from,id", 0, 0, { business, first: start.date, last: last.date })
    .flatMap((block) => block ? [{ id: block.id, ...blockDates(block) }] : []) : [];

  const input = { coach, capacity, startMs, durationMin, sessions, blocks, localDate: start.date,
    lastLocalDate: last.date, excludeId: record.id };
  let error;
  if (kind === "special") {
    error = validateSpecialSession({ ...input, title });
  } else if (!checkSchedule) {
    if (![1, 2].includes(capacity)) throw schedulingError("invalid_capacity");
  } else {
    const end = utcToLocal(new Date(endMs).toISOString(), timezone);
    const startMin = toMinutes(start.time) + (startMs % minuteMs) / minuteMs;
    const endMin = toMinutes(end.time) + (endMs % minuteMs) / minuteMs;
    const slots = coachSlots(app, coach, start.weekday);
    const startOffset = offsetMinutes(startMs, timezone);
    const reachesRepeatedHour = startOffset > offsetMinutes(endMs, timezone);
    const occupiesRepeatedHour = startOffset > offsetMinutes(endMs - 1, timezone);
    // Find the UTC minute of the backward change to cover both sides within a single slot.
    let repeatedStart = startMin;
    if (reachesRepeatedHour) {
      for (let minute = Math.floor(startMs / minuteMs) + 1; minute * minuteMs <= endMs; minute++) {
        if (offsetMinutes(minute * minuteMs, timezone) < startOffset) {
          repeatedStart = toMinutes(utcToLocal(new Date(minute * minuteMs).toISOString(), timezone).time);
          break;
        }
      }
    }
    error = validatePrivateSession({
      ...input, weekday: start.weekday, slots: end.date === start.date ? slots : [],
      startMin: occupiesRepeatedHour ? Math.min(startMin, repeatedStart) : startMin,
      endMin: reachesRepeatedHour ? Math.max(endMin, repeatedStart + 60) : endMin,
    });
  }
  if (error) throw schedulingError(error.code, error.conflictId);
}


export function hasPartnerMembership(app: core.App, client: string, session: core.Record) {
  const date = sessionDate(session, getBusinessTimezone(app, session.getString("business")));
  return app.findRecordsByFilter("memberships",
    "client = {:client} && status = 'active' && plan.service = {:service} && plan.partner = true",
    "", 0, 0, { client, service: session.getString("service") })
    .some((membership) => !!membership && covers(membership, date));
}

export function validatePrivatePartners(app: core.App, record: core.Record) {
  if (record.getString("kind") !== "private" || record.getString("status") === "cancelled") return;
  const previous = record.original();
  const changed = ["service", "starts_at"].some((field) => record.getString(field) !== previous.getString(field));
  const expanding = record.getInt("capacity") === 2 && previous.getInt("capacity") !== 2;

  if (!record.isNew() && !changed && !expanding) return;
  const bookings = record.isNew() ? [] : sessionBookings(app, record.id)
    .filter((booking) => !["cancelled", "late_cancelled"].includes(booking.getString("status")));
  if (changed && bookings.length) {
    throw fieldError("starts_at", "Cancel bookings before changing the session date or service.");
  }
  if (record.getInt("capacity") === 2 &&
    (!bookings.length || bookings.some((booking) => !hasPartnerMembership(app, booking.getString("client"), record)))) {
    throw schedulingError("partner_required");
  }
}
