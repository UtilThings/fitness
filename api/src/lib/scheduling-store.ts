/// <reference path="../../pb_data/types.d.ts" />

import { blockDates, fieldError, getRecord, pocketBaseDate, validateCoach } from "./schedule-store";
import {
  toMinutes, validateAvailabilitySlots, validatePrivateSession, validateSpecialSession,
} from "./scheduling";
import { nyOffsetMinutes, utcToLocal } from "./tz";

const messages: Record<string, string> = {
  coach_conflict: "El coach ya tiene una sesión en ese horario.",
  outside_availability: "La sesión debe quedar dentro de un tramo de disponibilidad del coach.",
  invalid_capacity: "El cupo indicado no es válido para esta sesión.",
  partner_required: "El cupo para dos personas requiere un plan partner activo por cliente.",
  title_required: "Escribe un título para la clase especial.",
  block_conflict: "La sesión coincide con un bloqueo del calendario.",
  invalid_slot: "Indica un tramo válido con la hora final posterior a la inicial.",
  overlapping_slots: "Los tramos del mismo día no pueden solaparse.",
};

export function schedulingError(code: string, conflictId?: string) {
  const message = messages[code];
  return new BadRequestError(message, {
    code: new ValidationError(code, message),
    ...(conflictId && { conflict_id: new ValidationError(conflictId, "Identificador del registro en conflicto.") }),
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
  if (!coach) throw fieldError("coach", "Elige un coach activo.");
  validateCoach(app, coach);
  const current = slot(record);
  const error = validateAvailabilitySlots([current, ...coachSlots(app, coach, current.weekday, record.id)]);
  if (error) throw schedulingError(error);
}

export function validateSessionRecord(app: core.App, record: core.Record) {
  const kind = record.getString("kind");
  const previousKind = record.original().getString("kind") || "regular";
  if (!record.isNew() && kind !== previousKind && [kind, previousKind].some((value) => value === "private" || value === "special")) {
    throw fieldError("kind", "El tipo de una sesión existente no se puede cambiar.");
  }
  if (kind !== "private" && kind !== "special") return;
  if (record.getString("status") === "cancelled") return;
  if (record.getString("template")) throw fieldError("template", "Esta sesión se agenda sin plantilla.");

  const coach = record.getString("coach");
  const capacity = record.getFloat("capacity");
  const title = record.getString("title").trim();
  if (kind === "private") {
    const service = getRecord(app, "services", record.getString("service"));
    if (!service?.getBool("active") || service.getString("kind") !== "personal") {
      throw fieldError("service", "Selecciona un servicio personal activo.");
    }
    if (!coach) throw fieldError("coach", "Elige un coach activo.");
  } else {
    record.set("title", title);
  }
  if (record.getString("status") !== "completed") validateCoach(app, coach);

  const startMs = Date.parse(record.getString("starts_at").replace(" ", "T"));
  const durationMin = record.getFloat("duration_min");
  if (!Number.isFinite(startMs)) throw fieldError("starts_at", "Indica una fecha y hora válidas.");
  if (!Number.isInteger(durationMin) || durationMin < 15 || durationMin > 240) {
    throw fieldError("duration_min", "Indica una duración de 15 a 240 minutos.");
  }
  const minuteMs = 60_000;
  const endMs = startMs + durationMin * minuteMs;
  const start = utcToLocal(new Date(startMs).toISOString());
  const last = utcToLocal(new Date(endMs - 1).toISOString());
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
    "date_from <= {:last} && date_to >= {:first}", "date_from,id", 0, 0, { first: start.date, last: last.date })
    .flatMap((block) => block ? [{ id: block.id, ...blockDates(block) }] : []) : [];

  const input = { coach, capacity, startMs, durationMin, sessions, blocks, localDate: start.date,
    lastLocalDate: last.date, excludeId: record.id };
  let error;
  if (kind === "special") {
    error = validateSpecialSession({ ...input, title });
  } else if (!checkSchedule) {
    if (![1, 2].includes(capacity)) throw schedulingError("invalid_capacity");
  } else {
    const end = utcToLocal(new Date(endMs).toISOString());
    const startMin = toMinutes(start.time) + (startMs % minuteMs) / minuteMs;
    const endMin = toMinutes(end.time) + (endMs % minuteMs) / minuteMs;
    const slots = coachSlots(app, coach, start.weekday);
    // The fall DST transition repeats 01:00–02:00. Cover both sides within one slot.
    const repeatsHour = nyOffsetMinutes(startMs) > nyOffsetMinutes(endMs - 1);
    error = validatePrivateSession({
      ...input, weekday: start.weekday, slots: end.date === start.date ? slots : [],
      startMin: repeatsHour ? Math.min(startMin, 60) : startMin,
      endMin: repeatsHour ? Math.max(endMin, 120) : endMin,
    });
  }
  if (error) throw schedulingError(error.code, error.conflictId);
}
