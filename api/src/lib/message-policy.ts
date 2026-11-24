import type { Locale, MessageKey } from "./message-render";
import { addLocalDays, utcToLocal } from "./tz";

const MINUTE = 60_000;
export const MAX_ATTEMPTS = 3;

export function resolveLocale(client: { locale?: string }): Locale {
  return client.locale === "en" ? "en" : "es";
}

// All operational keys share the same eligibility policy.
export function isEligible(client: { status: string; email?: string }, _key?: MessageKey): boolean {
  const email = client.email ?? "";
  const local = email.split("@")[0] ?? "";
  return (client.status === "active" || client.status === "paused") &&
    local.length <= 64 && email.length <= 254 && !local.startsWith(".") && !local.endsWith(".") && !local.includes("..") &&
    /^[^\s@<>(),;:\\"\[\]]+@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(email);
}

export function nextRetry(attempts: number, now: Date): Date | null {
  const delay = [5, 30][attempts - 1];
  return delay === undefined ? null : new Date(now.getTime() + delay * MINUTE);
}

type Session = { id: string; status: string; starts_at: string };
type Booking = { id: string; session: string; status: string };

export function reminderTargets<T extends Booking>(sessions: readonly Session[], bookings: readonly T[], now: Date, hours: number) {
  const start = now.getTime();
  const end = start + hours * 60 * MINUTE;
  const upcoming = new Set(sessions.filter((session) => {
    const starts = Date.parse(session.starts_at.replace(" ", "T"));
    return session.status === "scheduled" && starts > start && starts <= end;
  }).map(({ id }) => id));
  return bookings.filter((booking) => booking.status === "booked" && upcoming.has(booking.session))
    .map((booking) => ({ ...booking, dedupeKey: `class_reminder:${booking.id}` }));
}

export function isSendHour(now: Date, timezone: string): boolean {
  return utcToLocal(now.toISOString(), timezone).time.startsWith("09:");
}

export function noticeDate(now: Date, daysBefore: number, timezone: string): string {
  return addLocalDays(utcToLocal(now.toISOString(), timezone).date, daysBefore);
}

export function dueNotices<T extends { id: string; status: string; due_on: string }>(
  payments: readonly T[], now: Date, daysBefore: number, timezone: string,
) {
  const date = noticeDate(now, daysBefore, timezone);
  return payments.filter((payment) => payment.status === "pending" && payment.due_on.slice(0, 10) === date)
    .map((payment) => ({ ...payment, dedupeKey: `payment_due:${payment.id}:${date}` }));
}

export function renewalNotices<T extends { id: string; status: string; current_period_end: string }>(
  memberships: readonly T[], now: Date, daysBefore: number, timezone: string,
) {
  const date = noticeDate(now, daysBefore, timezone);
  return memberships.filter((membership) => membership.status === "active" && membership.current_period_end.slice(0, 10) === date)
    .map((membership) => ({ ...membership, dedupeKey: `membership_renewal:${membership.id}:${date}` }));
}
