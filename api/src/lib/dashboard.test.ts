import { describe, expect, test } from "bun:test";
import {
  buildAttention, buildCounts, localDayBoundsUtc, summarizeSessions,
  type DashboardBooking, type DashboardSession,
} from "./dashboard";

function bounds(now: string) {
  return localDayBoundsUtc(new Date(now), "America/New_York");
}

describe("día del dashboard en Nueva York", () => {
  test("usa la fecha local y cambia de día exactamente a medianoche", () => {
    expect(bounds("2026-11-22T03:30:00Z")).toEqual({
      date: "2026-11-21",
      startUtc: "2026-11-21T05:00:00.000Z",
      endUtc: "2026-11-22T05:00:00.000Z",
    });
    expect(bounds("2026-11-22T04:30:00Z").date).toBe("2026-11-21");
    expect(bounds("2026-11-22T05:00:00Z").date).toBe("2026-11-22");
  });

  test.each([
    ["2026-03-08T12:00:00Z", 23],
    ["2026-11-01T12:00:00Z", 25],
  ])("calcula ambos extremos del cambio de hora en %s", (now, hours) => {
    const { startUtc, endUtc } = bounds(now);
    expect((Date.parse(endUtc) - Date.parse(startUtc)) / 3_600_000).toBe(hours);
  });
});

function session(id: string, changes: Partial<DashboardSession> = {}): DashboardSession {
  return {
    id, starts_at: "2026-11-21 19:00:00.000Z", status: "scheduled", capacity: 4,
    coach: { id: "coach", name: "Coach" },
    service: { id: "service", name: "Entrenamiento", kind: "group" }, duration_min: 60,
    ...changes,
  };
}

function booking(session: string, status: DashboardBooking["status"]): DashboardBooking {
  return { id: session + status, session, status, waitlist_position: 0 };
}

test("cuenta ocupación, espera y disponibilidad por sesión", () => {
  const sessions = [session("cancelled", { status: "cancelled" }), session("today", { status: "completed" })];
  const reservations = [
    booking("today", "booked"), booking("today", "attended"), booking("today", "no_show"),
    booking("today", "waitlisted"), booking("today", "cancelled"), booking("today", "late_cancelled"),
    booking("cancelled", "booked"), booking("other", "waitlisted"),
  ];
  expect(summarizeSessions(sessions, reservations)).toEqual([
    { ...sessions[1], booked: 3, waitlisted: 1, spots_left: 1, availability: "almost" },
  ]);
  expect(buildCounts({ activeClients: 2, todaySessions: sessions, todayBookings: reservations, attention: [] }))
    .toEqual({
      active_clients: 2, sessions_today: 1, bookings_today: 3, waitlisted_today: 1,
      sessions_without_coach: 0, sessions_without_bookings: 0,
    });
});

test("solo genera alertas en la ventana programada y solo booked evita no_bookings", () => {
  const sessions = [
    session("no-coach", { coach: null }),
    session("no-bookings"),
    session("cancelled", { status: "cancelled", coach: null }),
    session("past", { starts_at: "2026-11-20T19:00:00Z", coach: null }),
    session("end", { starts_at: "2026-11-22T18:00:00Z", coach: null }),
  ];
  const attention = buildAttention(sessions, [booking("no-coach", "booked"), booking("no-bookings", "attended")],
    new Date("2026-11-21T18:00:00Z"), 1);
  expect(attention.map(({ session_id, reason }) => [session_id, reason]))
    .toEqual([["no-coach", "no_coach"], ["no-bookings", "no_bookings"]]);
});

test("dashboard day starts at the business midnight", () => {
  expect(localDayBoundsUtc(new Date("2026-06-02T04:30:00Z"), "America/Bogota")).toEqual({
    date: "2026-06-01", startUtc: "2026-06-01T05:00:00.000Z", endUtc: "2026-06-02T05:00:00.000Z",
  });
});
