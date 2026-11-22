/// <reference path="../../pb_data/types.d.ts" />

import { auditActor, getRecord } from "./schedule-store";
import type { BookingLike, BookingStatus } from "./booking-rules";

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
  return app.findRecordsByFilter("bookings", "session = {:session}", "", 0, 0, { session });
}

export function bookingRelation(app: core.App, collection: string, id: string, field: string) {
  const record = getRecord(app, collection, id);
  if (!record) throw bookingError(field, "Selecciona un registro válido.");
  return record;
}

export function setFreeClassUsed(app: core.App, client: core.Record, used: boolean, actor: string) {
  if (client.getBool("free_class_used") === used) return;
  client.set("free_class_used", used);
  auditActor(client, actor);
  app.save(client);
}
