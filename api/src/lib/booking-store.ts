/// <reference path="../../pb_data/types.d.ts" />

import { auditActor, getRecord } from "./schedule-store";
import { tenantRecord, type TenantCollection } from "./tenant";
import { pickPromotion, renumberWaitlist, shouldRestoreFreeClass, type BookingLike, type BookingStatus } from "./booking-rules";

export function requireBookingStaff(e: core.RequestEvent): string {
  if (e.auth?.collection().name !== "admins" || !e.auth.getBool("active")) {
    throw new ForbiddenError("Se requiere un miembro activo del equipo.");
  }
  return e.auth.id;
}

export function bookingError(field: string, message: string) {
  return new BadRequestError(message, { [field]: new ValidationError("validation_booking", message) });
}

export function bookingData(record: core.Record): BookingLike {
  return {
    id: record.id,
    status: record.getString("status") as BookingStatus,
    waitlist_position: record.getInt("waitlist_position"),
    free_class: record.getBool("free_class"),
    override_note: record.getString("override_note"),
  };
}

export function sessionBookings(app: core.App, session: string) {
  return app.findRecordsByFilter("bookings", "session = {:session}", "", 0, 0, { session })
    .filter((record): record is core.Record => !!record);
}

export function bookingRelation(app: core.App, collection: TenantCollection, id: string, field: string, business?: string) {
  const record = business === undefined ? getRecord(app, collection, id) : tenantRecord(app, collection, id, business);
  if (!record) throw bookingError(field, "Selecciona un registro válido.");
  return record;
}

export function setFreeClassUsed(app: core.App, client: core.Record, used: boolean, actor: string) {
  if (client.getBool("free_class_used") === used) return;
  client.set("free_class_used", used);
  auditActor(client, actor);
  app.save(client);
}

export const SESSION_CANCELLED_NOTE = "session_cancelled";

export function serviceCancellationHours(app: core.App, session: core.Record): number {
  return app.findRecordById("services", session.getString("service")).getInt("cancellation_hours");
}

export function restoreFreeClass(app: core.App, booking: core.Record, actor: string) {
  if (!booking.getBool("free_class") || booking.getString("membership") || booking.getString("status") !== "cancelled") return;
  const client = app.findRecordById("clients", booking.getString("client"));
  const reservations = app.findRecordsByFilter("bookings", "client = {:client} && free_class = true",
    "", 0, 0, { client: client.id }).flatMap((record) => record ? [bookingData(record)] : []);
  if (shouldRestoreFreeClass(bookingData(booking), "cancelled", reservations)) {
    setFreeClassUsed(app, client, false, actor);
  }
}

export function saveCancellation(
  app: core.App, booking: core.Record, status: "cancelled" | "late_cancelled", now: number, actor: string, note: string,
) {
  booking.load({
    status, waitlist_position: 0, cancelled_at: new Date(now).toISOString(),
    marked_by: actor, override_note: note,
  });
  auditActor(booking, actor);
  app.save(booking);
  restoreFreeClass(app, booking, actor);
}

export function updateWaitlist(app: core.App, session: core.Record, actor: string, freedSeat: boolean) {
  const records = sessionBookings(app, session.id);
  const bookings = records.map(bookingData);
  const promotion = freedSeat ? pickPromotion(bookings, session.getInt("capacity")) : undefined;
  const byId = new Map(records.map((record) => [record.id, record]));
  if (promotion) {
    const record = byId.get(promotion.id)!;
    record.set("status", "booked");
    record.set("waitlist_position", 0);
    auditActor(record, actor);
    app.save(record);
  }
  for (const entry of renumberWaitlist(bookings.filter((item) => item.id !== promotion?.id))) {
    const record = byId.get(entry.id)!;
    if (record.getInt("waitlist_position") === entry.waitlist_position) continue;
    record.set("waitlist_position", entry.waitlist_position);
    auditActor(record, actor);
    app.save(record);
  }
}
