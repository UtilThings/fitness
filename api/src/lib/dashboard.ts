import { availabilityOf, occupiedSeats, type BookingLike } from "./booking-rules";
import { localDateToUtcRange, utcToLocal } from "./tz";

export const DASHBOARD_TIMEZONE = "America/New_York";
const DAY_MS = 86_400_000;

export interface DashboardSession {
  id: string;
  service: { id: string; name: string; kind: string };
  starts_at: string;
  duration_min: number;
  coach: { id: string; name: string } | null;
  capacity: number;
  status: string;
}

export interface DashboardBooking extends BookingLike {
  session: string;
}

interface Attention {
  session_id: string;
  reason: "no_coach" | "no_bookings";
  starts_at: string;
}

export function localDayBoundsUtc(now: Date, timeZone: string) {
  if (timeZone !== DASHBOARD_TIMEZONE) throw new RangeError("Unsupported dashboard timezone");
  const { date } = utcToLocal(now.toISOString());
  const { from, to } = localDateToUtcRange(date);
  return { date, startUtc: from, endUtc: to };
}

export function attentionEndUtc(now: Date, days: number): string {
  return new Date(now.getTime() + days * DAY_MS).toISOString();
}

function groupBookings(bookings: DashboardBooking[]) {
  const groups = new Map<string, DashboardBooking[]>();
  for (const booking of bookings) {
    const group = groups.get(booking.session) ?? [];
    group.push(booking);
    groups.set(booking.session, group);
  }
  return groups;
}

function isVisible(session: DashboardSession) {
  return session.status === "scheduled" || session.status === "completed";
}

function timestamp(value: string) {
  return Date.parse(value.replace(" ", "T"));
}

export function summarizeSessions(sessions: DashboardSession[], bookings: DashboardBooking[]) {
  const groups = groupBookings(bookings);
  return sessions.filter(isVisible)
    .sort((a, b) => timestamp(a.starts_at) - timestamp(b.starts_at))
    .map((session) => {
      const reservations = groups.get(session.id) ?? [];
      const booked = occupiedSeats(reservations);
      const spots_left = Math.max(0, session.capacity - booked);
      return {
        ...session,
        booked,
        waitlisted: reservations.filter((booking) => booking.status === "waitlisted").length,
        spots_left,
        availability: availabilityOf(spots_left),
      };
    });
}

export function buildAttention(
  sessions: DashboardSession[], bookings: DashboardBooking[], now: Date, days: number,
): Attention[] {
  const bookedSessions = new Set(bookings.filter((booking) => booking.status === "booked")
    .map((booking) => booking.session));
  const end = Date.parse(attentionEndUtc(now, days));
  const attention: Attention[] = [];
  for (const session of sessions) {
    const start = timestamp(session.starts_at);
    if (session.status !== "scheduled" || start < now.getTime() || start >= end) continue;
    const entry = { session_id: session.id, starts_at: session.starts_at };
    if (!session.coach) attention.push({ ...entry, reason: "no_coach" });
    if (!bookedSessions.has(session.id)) attention.push({ ...entry, reason: "no_bookings" });
  }
  return attention.sort((a, b) => timestamp(a.starts_at) - timestamp(b.starts_at));
}

export function buildCounts({ activeClients, todaySessions, todayBookings, attention }: {
  activeClients: number;
  todaySessions: DashboardSession[];
  todayBookings: DashboardBooking[];
  attention: Attention[];
}) {
  const ids = new Set(todaySessions.filter(isVisible).map((session) => session.id));
  const reservations = todayBookings.filter((booking) => ids.has(booking.session));
  return {
    active_clients: activeClients,
    sessions_today: ids.size,
    bookings_today: occupiedSeats(reservations),
    waitlisted_today: reservations.filter((booking) => booking.status === "waitlisted").length,
    sessions_without_coach: attention.filter((item) => item.reason === "no_coach").length,
    sessions_without_bookings: attention.filter((item) => item.reason === "no_bookings").length,
  };
}
