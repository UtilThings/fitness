import { SESSION_CANCELLED_NOTE } from "./booking-store";
import { serviceContext } from "./message-context";
import { dueNotices, isSendHour, noticeDate, reminderTargets, renewalNotices } from "./message-policy";
import type { ServiceKey } from "./message-render";
import { sendServiceMessage, type MessageApp } from "./message-send";
import { getBusiness, tenantRecord } from "./tenant";
import { addLocalDays } from "./tz";

function dispatch(app: MessageApp, clientId: string, key: ServiceKey, dedupeKey: string, business: string, session?: core.Record) {
  try {
    const client = tenantRecord(app, "clients", clientId, business);
    if (!client || !getBusiness(app, business)?.getBool("active")) return;
    const context = serviceContext(app, key, session, dedupeKey, business);
    if (context) sendServiceMessage(app, { key, dedupeKey, client, context, session: session?.id });
  } catch {
    app.logger().error("No se pudo preparar el mensaje del servicio.", "key", key);
  }
}

export function bookingMessage(app: MessageApp, booking: core.Record, created: boolean) {
  const original = booking.original().getString("status");
  const status = booking.getString("status");
  const confirmed = created && status === "booked";
  const promoted = !created && original === "waitlisted" && status === "booked";
  // The session cascade preserves the previous booking state in this committed event.
  const cancelled = !created && ["booked", "waitlisted"].includes(original) &&
    status === "cancelled" && booking.getString("override_note") === SESSION_CANCELLED_NOTE;
  if (!confirmed && !promoted && !cancelled) return;
  const session = app.findRecordById("class_sessions", booking.getString("session"));
  if (cancelled && session.getString("status") !== "cancelled") return;
  const key = confirmed ? "booking_confirmed" : promoted ? "waitlist_promoted" : "class_cancelled";
  dispatch(app, booking.getString("client"), key, `${key}:${booking.id}`, booking.getString("business"), session);
}

export function classChangeMessages(app: MessageApp, session: core.Record) {
  if (session.getString("status") !== "scheduled") return;
  const before = session.original();
  if (["starts_at", "coach"].every((field) => before.getString(field) === session.getString(field))) return;
  const revision = $security.randomString(12);
  const bookings = app.findRecordsByFilter("bookings",
    "session = {:session} && (status = 'booked' || status = 'waitlisted')",
    "id", 0, 0, { session: session.id });
  for (const booking of bookings) {
    if (!booking) continue;
    dispatch(app, booking.getString("client"), "class_cancelled", `class_cancelled:${booking.id}:change:${revision}`, booking.getString("business"), session);
  }
}

function setting(name: string, fallback: number) {
  const raw = $os.getenv(name).trim();
  const count = Number(raw);
  return /^\d+$/.test(raw) && Number.isSafeInteger(count) && count > 0 ? count : fallback;
}

function dateFilter(date: Date) {
  return date.toISOString().replace("T", " ");
}

export function sendReminders(app: MessageApp, business: string, now = new Date()) {
  const hours = setting("MESSAGES_REMINDER_HOURS", 24);
  const time = { business, from: dateFilter(now), to: dateFilter(new Date(now.getTime() + hours * 3_600_000)) };
  const bookings = app.findRecordsByFilter("bookings",
    "business = {:business} && status = 'booked' && session.status = 'scheduled' && session.starts_at > {:from} && session.starts_at <= {:to}",
    "session,id", 0, 0, time);
  const sessions = new Map<string, core.Record>();
  const targets = [];
  for (const booking of bookings) {
    if (!booking) continue;
    const sessionId = booking.getString("session");
    if (!sessions.has(sessionId)) sessions.set(sessionId, app.findRecordById("class_sessions", sessionId));
    targets.push({ id: booking.id, session: sessionId, status: booking.getString("status"), client: booking.getString("client") });
  }
  const calendar = [...sessions.values()].map((session) => ({
    id: session.id, status: session.getString("status"), starts_at: session.getString("starts_at"),
  }));
  for (const target of reminderTargets(calendar, targets, now, hours)) {
    dispatch(app, target.client, "class_reminder", target.dedupeKey, business, sessions.get(target.session));
  }
}

export function sendDatedNotices(app: MessageApp, type: "payment_due" | "membership_renewal", business: string, timezone: string, now = new Date()) {
  if (!isSendHour(now, timezone)) return;
  const payment = type === "payment_due";
  const days = payment ? setting("MESSAGES_DUE_DAYS_BEFORE", 3) : setting("MESSAGES_RENEWAL_DAYS_BEFORE", 5);
  const date = noticeDate(now, days, timezone);
  const field = payment ? "due_on" : "current_period_end";
  const rows = app.findRecordsByFilter(payment ? "payments" : "memberships",
    `business = {:business} && status = {:status} && ${field} >= {:from} && ${field} < {:to}`,
    "id", 0, 0, { business, status: payment ? "pending" : "active", from: date, to: addLocalDays(date, 1) });
  const records = rows.flatMap((row) => row ? [{
    id: row.id, status: row.getString("status"), client: row.getString("client"),
    due_on: row.getString("due_on"), current_period_end: row.getString("current_period_end"),
  }] : []);
  const targets = payment ? dueNotices(records, now, days, timezone) : renewalNotices(records, now, days, timezone);
  for (const target of targets) dispatch(app, target.client, type, target.dedupeKey, business);
}
