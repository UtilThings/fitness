import { expect, test } from "bun:test";
import { aggregateAttendance, aggregateOccupancy, type ReportSession } from "./reports-attendance";

const session: ReportSession = {
  id: "a", starts_at: "2026-12-01T04:30:00.000Z", service: "strength", name: "Fuerza",
  coach_name: "Coach", capacity: 6, status: "scheduled",
};
const sessions = [
  { ...session, id: "b", service: "jump", name: "Jump", starts_at: "2026-12-01T05:00:00.000Z", capacity: 0 },
  { ...session, id: "cancelled", status: "cancelled" },
  session,
];

test("counts reserved spots and waitlist separately and excludes cancelled sessions", () => {
  const bookings = ["booked", "booked", "booked", "booked", "booked", "waitlisted"].map(
    (status) => ({ session: "a", status }),
  );
  bookings.push({ session: "cancelled", status: "booked" });
  const result = aggregateOccupancy(sessions, bookings, { timezone: "America/New_York" });
  expect(result.totals).toEqual({ sessions: 2, capacity: 6, booked: 5, occupancy_rate: 0.8333 });
  expect(result.by_class.map(({ session_id }) => session_id)).toEqual(["a", "b"]);
  expect(result.by_class[0]).toMatchObject({ waitlisted: 1, occupancy_rate: 0.8333 });
  expect(result.by_class[1]).toMatchObject({ booked: 0, occupancy_rate: 0 });
  for (const key of ["sessions", "capacity", "booked"] as const) {
    expect(result.by_service.reduce((sum, row) => sum + row[key], 0)).toBe(result.totals[key]);
  }
  expect(aggregateOccupancy(sessions, bookings, { service: "jump", timezone: "America/New_York" }).totals.booked).toBe(0);
  expect(aggregateOccupancy([], [], { timezone: "America/New_York" }).by_class).toEqual([]);
});

test("uses local days and excludes cancellations and waitlist from the concluded denominator", () => {
  const bookings = [
    ...["booked", "attended", "attended", "no_show", "late_cancelled", "cancelled", "waitlisted"].map(
      (status) => ({ session: "a", status }),
    ),
    { session: "b", status: "booked" },
    { session: "cancelled", status: "no_show" },
  ];
  const result = aggregateAttendance(sessions, bookings, { timezone: "America/New_York" });
  expect(result.totals).toEqual({
    booked: 2, attended: 2, no_show: 1, late_cancelled: 1, cancelled: 1,
    no_show_rate: 0.3333, attendance_rate: 0.6667,
  });
  expect(result.by_day.map(({ day }) => day)).toEqual(["2026-11-30", "2026-12-01"]);
  for (const key of ["booked", "attended", "no_show", "late_cancelled", "cancelled"] as const) {
    expect(result.by_service.reduce((sum, row) => sum + row[key], 0)).toBe(result.totals[key]);
  }
  for (const totals of [
    aggregateAttendance([], [], { timezone: "America/New_York" }).totals,
    aggregateAttendance(sessions, bookings, { service: "jump", timezone: "America/New_York" }).totals,
  ]) {
    expect(totals).toMatchObject({ no_show_rate: 0, attendance_rate: 0, no_show: 0 });
  }
});
