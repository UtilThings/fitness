import { expect, test } from "bun:test";
import { dueNotices, isEligible, isSendHour, nextRetry, reminderTargets, renewalNotices, resolveLocale } from "./message-policy";

const now = new Date("2026-03-08T13:00:00Z");

test("envía solo a clientes elegibles y usa español por defecto", () => {
  for (const status of ["active", "paused"]) {
    expect(isEligible({ status, email: "ana+reservas@example.test" })).toBe(true);
  }
  expect(isEligible({ status: "inactive", email: "ana@example.test" })).toBe(false);
  for (const email of [undefined, "", "ana", "ana@localhost", "ana..rojas@example.test", " ana@example.test", "ana@example.test\n"]) {
    expect(isEligible({ status: "active", email })).toBe(false);
  }
  expect(resolveLocale({})).toBe("es");
  expect(resolveLocale({ locale: "en" })).toBe("en");
});

test("calcula dos reintentos después del envío inicial", () => {
  expect(nextRetry(1, now)?.toISOString()).toBe("2026-03-08T13:05:00.000Z");
  expect(nextRetry(2, now)?.toISOString()).toBe("2026-03-08T13:30:00.000Z");
  expect(nextRetry(3, now)).toBeNull();
});

test("incluye el límite superior de la ventana y excluye cancelaciones y lista de espera", () => {
  const sessions = [
    { id: "one", status: "scheduled", starts_at: "2026-03-09T13:00:00Z" },
    { id: "two", status: "scheduled", starts_at: "2026-03-09T13:00:01Z" },
    { id: "three", status: "cancelled", starts_at: "2026-03-09T12:00:00Z" },
    { id: "four", status: "scheduled", starts_at: now.toISOString() },
  ];
  const bookings = sessions.map(({ id }) => ({ id, session: id, status: "booked" }));
  bookings.push({ id: "five", session: "one", status: "waitlisted" });
  expect(reminderTargets(sessions, bookings, now, 24).map(({ dedupeKey }) => dedupeKey)).toEqual(["class_reminder:one"]);
});

test("usa fechas civiles y genera claves estables por vencimiento y periodo", () => {
  const payments = [
    { id: "one", status: "pending", due_on: "2026-03-11 00:00:00.000Z" },
    { id: "two", status: "pending", due_on: "2026-03-07" },
    { id: "three", status: "paid", due_on: "2026-03-11" },
  ];
  const notices = dueNotices(payments, now, 3);
  expect(notices.map(({ dedupeKey }) => dedupeKey)).toEqual(["payment_due:one:2026-03-11"]);
  expect(dueNotices(payments, now, 3)).toEqual(notices);
  const membership = { id: "one", status: "active", current_period_end: "2026-03-13" };
  expect(renewalNotices([membership], now, 5)[0]?.dedupeKey).toBe("membership_renewal:one:2026-03-13");
  expect(renewalNotices([{ ...membership, current_period_end: "2026-03-14" }], now, 6)[0]?.dedupeKey)
    .toBe("membership_renewal:one:2026-03-14");
});

test("las 09:00 locales se mantienen en los dos cambios de horario", () => {
  expect(isSendHour(now)).toBe(true);
  expect(isSendHour(new Date("2026-03-08T12:59:59Z"))).toBe(false);
  expect(isSendHour(new Date("2026-11-01T14:59:59Z"))).toBe(true);
  expect(isSendHour(new Date("2026-11-01T15:00:00Z"))).toBe(false);
});
