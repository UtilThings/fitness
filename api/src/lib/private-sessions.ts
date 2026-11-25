/// <reference path="../../pb_data/types.d.ts" />

import { canBook } from "./booking-rules";
import { bookingError, bookingRelation } from "./booking-store";
import { authorizeBooking } from "./membership-bookings";
import { membershipToday, requireMembershipRole } from "./memberships-service";
import { auditActor, fieldError, inScheduleTransaction, pocketBaseDate, scheduleAudit } from "./schedule-store";
import { privateCapacity } from "./scheduling";
import { hasPartnerMembership, schedulingError } from "./scheduling-store";
import { getBusinessTimezone, tenantRecord } from "./tenant";
import { validateMove } from "./session-rules";

export function privateSessionDraft(app: core.App, body: Record<string, unknown>, business: string) {
  const { coach, service, starts_at, duration_min } = body;
  if (typeof service !== "string" || !service) throw fieldError("service", "Select a personal training service.");
  const offering = tenantRecord(app, "services", service, business);
  if (!offering?.getBool("active") || offering.getString("kind") !== "personal") {
    throw fieldError("service", "Select an active personal training service.");
  }
  const dateError = validateMove({ startsAt: starts_at, now: Date.now() });
  if (dateError) throw fieldError("starts_at", dateError);
  if (duration_min !== undefined &&
      (typeof duration_min !== "number" || !Number.isInteger(duration_min) || duration_min < 15 || duration_min > 240)) {
    throw fieldError("duration_min", "Enter a duration from 15 to 240 minutes.");
  }
  return new Record(app.findCollectionByNameOrId("class_sessions"), {
    business, coach, service, starts_at, duration_min, status: "scheduled", kind: "private", capacity: 1,
  });
}

export function createPrivateSession(e: core.RequestEvent) {
  const actor = requireMembershipRole(e, ["owner", "reception", "coach"]);
  const body = e.requestInfo().body;
  const { coach, notes, overrides, capacity } = body;
  if (typeof coach !== "string" || !coach) throw fieldError("coach", "Choose an active coach.");
  if (e.auth?.getString("role") === "coach" && coach !== actor) {
    throw new ForbiddenError("You can only schedule sessions for yourself.");
  }
  const clientIds: unknown = body.client_ids;
  if (!Array.isArray(clientIds) || clientIds.length < 1 || clientIds.length > 2 ||
      clientIds.some((id) => typeof id !== "string" || !id) || new Set(clientIds).size !== clientIds.length) {
    throw fieldError("client_ids", "Select one or two different clients.");
  }
  if (notes !== undefined && (typeof notes !== "string" || Array.from(notes).length > 500)) {
    throw fieldError("notes", "Notes can contain up to 500 characters.");
  }
  if (overrides !== undefined &&
    (!overrides || typeof overrides !== "object" || Array.isArray(overrides))) {
    throw fieldError("overrides", "Enter a separate override note for each client.");
  }
  const exceptions = new Map<string, string>();
  for (const [id, value] of Object.entries(overrides ?? {})) {
    const note = value && typeof value === "object" && "override_note" in value ? value.override_note : undefined;
    if (!clientIds.includes(id) || typeof note !== "string" || !note.trim() ||
        Array.from(note).length > 500 || note.trim() === "session_cancelled") {
      throw fieldError("overrides", "Each override requires a valid note for the selected client.");
    }
    exceptions.set(id, note.trim());
  }
  if (exceptions.size) requireMembershipRole(e, ["owner", "reception"]);

  return inScheduleTransaction(e.app, (tx) => {
    const business = e.auth!.getString("business");
    const session = privateSessionDraft(tx, body, business);
    if (body.duration_min === undefined) throw fieldError("duration_min", "Enter the session duration.");
    const duplicate = tx.findRecordsByFilter("class_sessions",
      "coach = {:coach} && service = {:service} && starts_at = {:starts} && kind = 'private' && status = 'scheduled'",
      "", 1, 0, { coach, service: session.getString("service"), starts: pocketBaseDate(new Date(
        Date.parse(session.getString("starts_at").replace(" ", "T")),
      ).toISOString()) });
    if (duplicate.length) {
      throw new ApiError(409, "A private session already exists for that coach, service, and time.", {
        code: new ValidationError("duplicate_session", "A private session already exists at that time."),
      });
    }
    const clients = clientIds.map((id) => bookingRelation(tx, "clients", id, "client_ids", business));
    const partnerCount = clients.filter((client) => hasPartnerMembership(tx, client.id, session)).length;
    const seats = privateCapacity({ clientCount: clients.length, partnerCount, capacity: capacity as number | undefined });
    if (typeof seats !== "number") throw schedulingError(seats.code);

    session.set("notes", notes ?? "");
    auditActor(session, actor);
    // The session starts with one seat. A two-seat update verifies the reservations
    // already created in this same transaction, just like a later capacity edit.
    tx.save(session);
    const collection = tx.findCollectionByNameOrId("bookings");
    const now = Date.now();
    const today = membershipToday(getBusinessTimezone(tx, business, e));
    const bookings = clients.map((client) => {
      const decision = canBook({
        session: { starts_at: session.getString("starts_at"), status: session.getString("status") },
        client: { status: client.getString("status") }, now,
      });
      if (!decision.ok) throw bookingError(decision.field, decision.message);
      const note = exceptions.get(client.id) ?? "";
      const entitlement = authorizeBooking(tx, client, session, { actor, today, now, override: !!note, reportClient: true });
      const booking = new Record(collection, {
        business, session: session.id, client: client.id, status: "booked", source: "admin", override_note: note,
        membership: entitlement.membership?.id ?? "", free_class: entitlement.freeClass ?? false,
      });
      auditActor(booking, actor);
      tx.save(booking);
      return booking;
    });
    const scheduled = seats === 2 ? tx.findRecordById("class_sessions", session.id) : session;
    if (seats === 2) {
      scheduled.set("capacity", seats);
      auditActor(scheduled, actor);
      tx.save(scheduled);
    }
    scheduleAudit(tx, "class_sessions", session.id, actor,
      "Private session scheduled.",
      { booked: bookings.length, coach, starts_at: session.getString("starts_at"), clients: clientIds });
    return { session: scheduled, bookings };
  });
}
