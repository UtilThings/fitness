export type BookingStatus =
  | "booked" | "waitlisted" | "cancelled" | "late_cancelled" | "attended" | "no_show";

export interface BookingLike {
  id: string;
  status: BookingStatus;
  waitlist_position: number;
  free_class?: boolean;
  override_note?: string;
}

type Time = string | number | Date;
type Override = { requested?: boolean; note?: string };
type Decision = { ok: true } | { ok: false; field: string; message: string };

function timestamp(time: Time): number {
  if (typeof time === "string") return Date.parse(time.replace(" ", "T"));
  return Number(time);
}

export function occupiesSeat(booking: BookingLike): boolean {
  return booking.status === "booked" || booking.status === "attended" || booking.status === "no_show";
}

export function occupiedSeats(bookings: BookingLike[]): number {
  return bookings.filter(occupiesSeat).length;
}

export function spotsLeft(capacity: number, bookings: BookingLike[]): number {
  return Math.max(0, capacity - occupiedSeats(bookings));
}

export function availabilityOf(spots: number): "full" | "almost" | "available" {
  return spots <= 0 ? "full" : spots <= 2 ? "almost" : "available";
}

export function isCancelled(status: BookingStatus): boolean {
  return status === "cancelled" || status === "late_cancelled";
}

export function canBook({ session, client, existing, now }: {
  session: { status: string; starts_at: Time };
  client: { status: string };
  existing?: BookingLike;
  now: Time;
}): Decision {
  if (session.status !== "scheduled" || !(timestamp(session.starts_at) > timestamp(now))) {
    return { ok: false, field: "session", message: "Select a scheduled session that has not started." };
  }
  if (client.status === "inactive") {
    return { ok: false, field: "client", message: "The client is inactive." };
  }
  if (existing && !isCancelled(existing.status)) {
    return { ok: false, field: "client", message: "The client already has a booking for this session." };
  }
  return { ok: true };
}

export function decideBookingStatus(capacity: number, bookings: BookingLike[]):
  { status: "booked" } | { status: "waitlisted"; position: number } {
  if (spotsLeft(capacity, bookings)) return { status: "booked" };
  const lastPosition = bookings.reduce((position, booking) =>
    booking.status === "waitlisted" ? Math.max(position, booking.waitlist_position) : position, 0);
  return { status: "waitlisted", position: lastPosition + 1 };
}

function orderedWaitlist(bookings: BookingLike[]): BookingLike[] {
  return bookings.filter((booking) => booking.status === "waitlisted")
    .sort((a, b) => a.waitlist_position - b.waitlist_position || a.id.localeCompare(b.id));
}

export function pickPromotion(bookings: BookingLike[], capacity: number): BookingLike | undefined {
  return spotsLeft(capacity, bookings) ? orderedWaitlist(bookings)[0] : undefined;
}

export function renumberWaitlist(bookings: BookingLike[]): BookingLike[] {
  return orderedWaitlist(bookings).map((booking, i) => ({ ...booking, waitlist_position: i + 1 }));
}

export function cancellationDeadline(startsAt: Time, cancellationHours: number): Date {
  return new Date(timestamp(startsAt) - cancellationHours * 3_600_000);
}

function missingOverrideNote(override?: Override): boolean {
  return Boolean(override?.requested && !override.note?.trim());
}

export function decideCancellation({ booking, startsAt, cancellationHours, now, override }: {
  booking: BookingLike;
  startsAt: Time;
  cancellationHours: number;
  now: Time;
  override?: Override;
}): { ok: true; status: "cancelled" | "late_cancelled" } | Extract<Decision, { ok: false }> {
  if (!["booked", "waitlisted"].includes(booking.status) || timestamp(now) >= timestamp(startsAt)) {
    return { ok: false, field: "status", message: "This booking can no longer be canceled." };
  }
  if (missingOverrideNote(override)) {
    return { ok: false, field: "override_note", message: "Enter a reason for the override." };
  }
  const late = booking.status === "booked" && timestamp(now) > Number(cancellationDeadline(startsAt, cancellationHours));
  return { ok: true, status: late && !override?.note?.trim() ? "late_cancelled" : "cancelled" };
}

export function shouldRestoreFreeClass(
  booking: BookingLike, nextStatus: BookingStatus, clientBookings: BookingLike[],
): boolean {
  return booking.free_class === true && nextStatus === "cancelled" &&
    !clientBookings.some((other) => other.id !== booking.id && other.free_class &&
      (occupiesSeat(other) || other.status === "late_cancelled"));
}

export function canMarkAttendance({ startsAt, now, override }: {
  startsAt: Time;
  now: Time;
  override?: Override;
}): boolean {
  return timestamp(now) >= timestamp(startsAt) || Boolean(override?.note?.trim());
}

export function nextAttendanceStatus({ booking, status, startsAt, now, override }: {
  booking: BookingLike;
  status: "attended" | "no_show";
  startsAt: Time;
  now: Time;
  override?: Override;
}): Decision {
  const correction = booking.status === "attended" || booking.status === "no_show";
  if (booking.status !== "booked" && (!correction || status === booking.status)) {
    return { ok: false, field: "status", message: "This attendance change is not allowed." };
  }
  if (!canMarkAttendance({ startsAt, now, override }) || (correction && !override?.note?.trim())) {
    return { ok: false, field: "override_note", message: "Enter a reason for the override or correction." };
  }
  return { ok: true };
}

/** Events for model success hooks (013, 015, 018). Compare record.original() with the saved record. */
export function classifyTransition(old: BookingLike | undefined, next: BookingLike) {
  if (old?.status === next.status) return undefined;
  switch (next.status) {
    case "booked":
      if (old?.status === "waitlisted") return "booking.promoted";
      if (!old || isCancelled(old.status)) return "booking.created";
      break;
    case "waitlisted":
      if (!old || isCancelled(old.status)) return "booking.waitlisted";
      break;
    case "cancelled":
      if (old?.status === "booked" || old?.status === "waitlisted") {
        return next.override_note === "session_cancelled" ? "booking.cancelled_by_session" : "booking.cancelled";
      }
      break;
    case "late_cancelled":
      if (old?.status === "booked") return "booking.late_cancelled";
      break;
    case "attended":
      if (old?.status === "booked" || old?.status === "no_show") return "booking.attended";
      break;
    case "no_show":
      if (old?.status === "booked" || old?.status === "attended") return "booking.no_show";
      break;
  }
}
