/// <reference path="../../pb_data/types.d.ts" />

import { bookingData, bookingError, sessionBookings } from "./booking-store";
import { availabilityOf, cancellationDeadline, occupiedSeats, spotsLeft, type BookingLike } from "./booking-rules";
import { pocketBaseDate, scheduledInRange } from "./schedule-store";
import { getBusinessTimezone } from "./tenant";
import { addLocalDays, startOfLocalDay } from "./tz";

export function availabilityRange(from: string, to: string, timezone: string) {
  const localDate = /^\d{4}-\d{2}-\d{2}$/;
  const utcTime = /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?Z$/;
  const parse = (value: string) => {
    if (localDate.test(value)) return startOfLocalDay(value, timezone);
    const match = utcTime.exec(value);
    if (!match) throw new RangeError();
    startOfLocalDay(match[1], timezone);
    return new Date(value).toISOString();
  };
  try {
    const start = parse(from);
    const end = parse(to);
    const latest = localDate.test(from) && localDate.test(to)
      ? startOfLocalDay(addLocalDays(from, 62), timezone)
      : new Date(Date.parse(start) + 62 * 86_400_000).toISOString();
    if (end <= start || end > latest) throw new RangeError();
    return { from: start, to: end };
  } catch {
    throw bookingError("to", "Indica un rango válido de hasta 62 días.");
  }
}

function summarize(session: core.Record, bookings: BookingLike[], cancellationHours: number) {
  const capacity = session.getInt("capacity");
  const spots = spotsLeft(capacity, bookings);
  return {
    session: session.id,
    capacity,
    booked: occupiedSeats(bookings),
    waitlisted: bookings.filter((booking) => booking.status === "waitlisted").length,
    spots_left: spots,
    availability: availabilityOf(spots),
    cancellation_deadline: cancellationDeadline(session.getString("starts_at"), cancellationHours).toISOString(),
  };
}

export function singleSessionAvailability(app: core.App, session: core.Record) {
  const service = app.findRecordById("services", session.getString("service"));
  return summarize(session, sessionBookings(app, session.id).map(bookingData), service.getInt("cancellation_hours"));
}

export function rangeAvailability(app: core.App, from: string, to: string, business: string) {
  const range = availabilityRange(from, to, getBusinessTimezone(app, business));
  const sessions = scheduledInRange(app, range, business);
  if (!sessions.length) return [];
  const reservations = app.findRecordsByFilter("bookings",
    "business = {:business} && session.status = 'scheduled' && session.starts_at >= {:from} && session.starts_at < {:to} && (status = 'booked' || status = 'attended' || status = 'no_show' || status = 'waitlisted')",
    "", 0, 0, { business, from: pocketBaseDate(range.from), to: pocketBaseDate(range.to) });
  const grouped = new Map<string, BookingLike[]>();
  for (const booking of reservations) {
    const id = booking.getString("session");
    const group = grouped.get(id) ?? [];
    group.push(bookingData(booking));
    grouped.set(id, group);
  }
  const errors = app.expandRecords(sessions, ["service"], null);
  if (Object.keys(errors).length) throw new InternalServerError("No se pudieron cargar los servicios.");
  return sessions.map((session) => summarize(
    session, grouped.get(session.id) ?? [], session.expandedOne("service").getInt("cancellation_hours"),
  ));
}
