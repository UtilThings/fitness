import { describe, expect, test } from "bun:test";
import {
  availabilityOf, canBook, cancellationDeadline, classifyTransition, decideBookingStatus,
  decideCancellation, nextAttendanceStatus, occupiedSeats, pickPromotion, renumberWaitlist,
  shouldRestoreFreeClass, spotsLeft, type BookingStatus,
} from "./booking-rules";

const booking = (status: BookingStatus, id = status as string, position = 0, free_class = false) =>
  ({ id, status, waitlist_position: position, free_class });
const startsAt = "2026-11-23 14:00:00.000Z";
const start = Date.parse("2026-11-23T14:00:00Z");
const deadline = start - 12 * 3_600_000;

describe("capacity and queue", () => {
  const occupied = ["booked", "attended", "no_show", "booked", "booked", "booked"]
    .map((status, index) => booking(status as BookingStatus, String(index)));
  const first = booking("waitlisted", "first", 1);
  const second = booking("waitlisted", "second", 2);
  const third = booking("waitlisted", "third", 3);
  const history = [booking("cancelled"), booking("late_cancelled"), first, second, third];
  test("occupancy ignores history and caps remaining spots at zero", () => {
    expect(occupiedSeats([...occupied, ...history])).toBe(6);
    expect(spotsLeft(5, occupied)).toBe(0);
    expect(spotsLeft(7, occupied)).toBe(1);
    expect(decideBookingStatus(0, [])).toEqual({ status: "waitlisted", position: 1 });
    expect(decideBookingStatus(6, [...occupied, ...history])).toEqual({ status: "waitlisted", position: 4 });
    expect(decideBookingStatus(7, occupied)).toEqual({ status: "booked" });
    expect([0, 1, 2, 3].map(availabilityOf)).toEqual(["full", "almost", "almost", "available"]);
  });
  test("promotes the first in line only when there is a seat and closes gaps", () => {
    expect(pickPromotion([...occupied, ...history], 6)).toBeUndefined();
    expect(pickPromotion([...occupied, third, first, second], 7)).toEqual(first);
    expect(renumberWaitlist([third, ...occupied, first])).toEqual([first, { ...third, waitlist_position: 2 }]);
  });
  test("validates session, client and duplicate, allowing paused and rebooking", () => {
    const input = { session: { status: "scheduled", starts_at: startsAt }, client: { status: "paused" }, now: deadline };
    expect(canBook(input)).toEqual({ ok: true });
    expect(canBook({ ...input, existing: booking("late_cancelled") })).toEqual({ ok: true });
    expect(canBook({ ...input, now: start })).toMatchObject({ field: "session" });
    expect(canBook({ ...input, session: { ...input.session, status: "cancelled" } })).toMatchObject({ field: "session" });
    expect(canBook({ ...input, client: { status: "inactive" } })).toMatchObject({ field: "client" });
    expect(canBook({ ...input, existing: first })).toMatchObject({ field: "client" });
  });
});

describe("transitions", () => {
  const base = { booking: booking("booked", "free", 0, true), startsAt, cancellationHours: 12, now: deadline };
  test("deadline is inclusive and calculated in UTC for both windows", () => {
    expect(cancellationDeadline(startsAt, 12).toISOString()).toBe("2026-11-23T02:00:00.000Z");
    expect(cancellationDeadline(startsAt, 24).toISOString()).toBe("2026-11-22T14:00:00.000Z");
    expect(decideCancellation(base)).toEqual({ ok: true, status: "cancelled" });
    const late = { ...base, now: deadline + 1000 };
    expect(decideCancellation(late)).toEqual({ ok: true, status: "late_cancelled" });
    expect(decideCancellation({ ...late, booking: booking("waitlisted") })).toMatchObject({ status: "cancelled" });
    expect(decideCancellation({ ...late, override: { requested: true, note: " " } })).toMatchObject({ field: "override_note" });
    expect(decideCancellation({ ...late, override: { note: "Emergencia" } })).toMatchObject({ status: "cancelled" });
    expect(decideCancellation({ ...base, now: start })).toMatchObject({ field: "status" });
    expect(decideCancellation({ ...base, booking: booking("attended") })).toMatchObject({ field: "status" });
  });
  test("restores a free class only on penalty-free cancellation without another consumption", () => {
    expect(shouldRestoreFreeClass(base.booking, "cancelled", [base.booking])).toBe(true);
    expect(shouldRestoreFreeClass(booking("waitlisted", "waiting", 1, true), "cancelled", [])).toBe(true);
    expect(shouldRestoreFreeClass(booking("booked"), "cancelled", [])).toBe(false);
    for (const status of ["late_cancelled", "no_show", "attended", "booked"] as const) {
      expect(shouldRestoreFreeClass(base.booking, status, [])).toBe(false);
      expect(shouldRestoreFreeClass(base.booking, "cancelled", [booking(status, "other", 0, true)])).toBe(false);
    }
  });
  test("attendance starts at session time, with notes for exceptions and corrections", () => {
    const attendance = { ...base, status: "attended" as const };
    expect(nextAttendanceStatus(attendance)).toMatchObject({ field: "override_note" });
    expect(nextAttendanceStatus({ ...attendance, now: start })).toEqual({ ok: true });
    expect(nextAttendanceStatus({ ...attendance, override: { note: "Excepción" } })).toEqual({ ok: true });
    expect(nextAttendanceStatus({ ...attendance, booking: booking("cancelled") })).toMatchObject({ field: "status" });
    expect(nextAttendanceStatus({ ...attendance, now: start, booking: booking("no_show") })).toMatchObject({ field: "override_note" });
    expect(nextAttendanceStatus({ ...attendance, booking: booking("no_show"), override: { note: "Corrección" } })).toEqual({ ok: true });
  });

  const statuses = ["booked", "waitlisted", "cancelled", "late_cancelled", "attended", "no_show"] as const;
  const events = [
    ["created", "waitlisted", "", "", "", ""],
    ["", "", "cancelled", "late_cancelled", "attended", "no_show"],
    ["promoted", "", "cancelled", "", "", ""],
    ["created", "waitlisted", "", "", "", ""],
    ["created", "waitlisted", "", "", "", ""],
    ["", "", "", "", "", "no_show"],
    ["", "", "", "", "attended", ""],
  ];
  test("classifies all status pairs and the cancellation cascade", () => {
    for (const [i, previous] of [undefined, ...statuses].entries()) {
      for (const [j, next] of statuses.entries()) {
        const event = events[i][j];
        expect(classifyTransition(previous ? booking(previous) : undefined, booking(next)))
          .toBe(event ? "booking." + event : undefined);
      }
    }
    expect(classifyTransition(booking("waitlisted"), { ...booking("cancelled"), override_note: "session_cancelled" }))
      .toBe("booking.cancelled_by_session");
  });
});
