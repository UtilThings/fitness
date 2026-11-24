import { bucketKey, utcToLocalParts, type GroupBy } from "./reports-range";

export type ReportSession = {
  id: string;
  starts_at: string;
  service: string;
  name: string;
  coach_name: string;
  capacity: number;
  status: string;
};
export type ReportBooking = { session: string; status: string };
type ServiceFilter = { service?: string };

export function reportRate(numerator: number, denominator: number): number {
  return denominator ? Math.round(numerator / denominator * 10_000) / 10_000 : 0;
}

function sessionsWithBookings(sessions: ReportSession[], bookings: ReportBooking[], { service }: ServiceFilter) {
  const bySession = new Map<string, string[]>();
  for (const booking of bookings) {
    const statuses = bySession.get(booking.session) ?? [];
    statuses.push(booking.status);
    bySession.set(booking.session, statuses);
  }
  return sessions
    .filter((session) => session.status !== "cancelled" && (!service || session.service === service))
    .map((session) => ({ session, statuses: bySession.get(session.id) ?? [] }));
}

function occupancyCounts() {
  return { sessions: 0, capacity: 0, booked: 0 };
}

function occupancyRates<T extends ReturnType<typeof occupancyCounts>>(row: T) {
  return { ...row, occupancy_rate: reportRate(row.booked, row.capacity) };
}

function compareName(a: { name: string }, b: { name: string }) {
  return a.name.localeCompare(b.name);
}

export function aggregateOccupancy(sessions: ReportSession[], bookings: ReportBooking[], opts: ServiceFilter & { timezone: string }) {
  const totals = occupancyCounts();
  const services = new Map<string, ReturnType<typeof occupancyCounts> & { name: string; service: string }>();
  const byClass = sessionsWithBookings(sessions, bookings, opts).map(({ session, statuses }) => {
    const { id, service, starts_at, coach_name, capacity, name } = session;
    const booked = statuses.filter((status) => status === "booked" || status === "attended" || status === "no_show").length;
    const row = services.get(service) ?? { service, name, ...occupancyCounts() };
    for (const count of [totals, row]) {
      count.sessions++;
      count.capacity += capacity;
      count.booked += booked;
    }
    services.set(service, row);
    const { date, time } = utcToLocalParts(starts_at, opts.timezone);
    return {
      session_id: id, starts_at, local_date: date, local_time: time, service, coach_name, capacity, booked,
      waitlisted: statuses.filter((status) => status === "waitlisted").length,
      occupancy_rate: reportRate(booked, capacity),
    };
  });
  return {
    totals: occupancyRates(totals),
    by_service: [...services.values()].sort(compareName).map(occupancyRates),
    by_class: byClass.sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at) || a.session_id.localeCompare(b.session_id)),
  };
}

function attendanceCounts() {
  return { booked: 0, attended: 0, no_show: 0, late_cancelled: 0, cancelled: 0 };
}
type AttendanceCounts = ReturnType<typeof attendanceCounts>;

function attendanceRates<T extends AttendanceCounts>(row: T) {
  const concluded = row.attended + row.no_show;
  return { ...row, no_show_rate: reportRate(row.no_show, concluded), attendance_rate: reportRate(row.attended, concluded) };
}

export function aggregateAttendance(
  sessions: ReportSession[],
  bookings: ReportBooking[],
  opts: ServiceFilter & { timezone: string; groupBy?: GroupBy },
) {
  const totals = attendanceCounts();
  const services = new Map<string, AttendanceCounts & { name: string; service: string }>();
  const days = new Map<string, AttendanceCounts & { day: string }>();
  for (const { session, statuses } of sessionsWithBookings(sessions, bookings, opts)) {
    const { service, name, starts_at } = session;
    const day = bucketKey(starts_at, opts.groupBy ?? "day", opts.timezone);
    const serviceRow = services.get(service) ?? { service, name, ...attendanceCounts() };
    const dayRow = days.get(day) ?? { day, ...attendanceCounts() };
    for (const status of statuses) {
      if (Object.prototype.hasOwnProperty.call(totals, status)) {
        const key = status as keyof AttendanceCounts;
        totals[key]++;
        serviceRow[key]++;
        dayRow[key]++;
      }
    }
    services.set(service, serviceRow);
    days.set(day, dayRow);
  }
  return {
    totals: attendanceRates(totals),
    by_service: [...services.values()].sort(compareName).map(attendanceRates),
    by_day: [...days.values()].sort((a, b) => a.day.localeCompare(b.day)).map(attendanceRates),
  };
}
