import { expect, test } from "bun:test";
import { buildDueReport, chargeForPeriod, classifyDue } from "./payments-due";

const today = "2026-11-21";

test("la ventana incluye hoy y su límite de siete días", () => {
  expect(classifyDue(today, today, 7)).toBe("due_soon");
  expect(classifyDue(today, "2026-11-22", 7)).toBe("overdue");
  expect(classifyDue("2026-11-28", today, 7)).toBe("due_soon");
  expect(classifyDue("2026-11-29", today, 7)).toBe("future");
  expect(classifyDue("", today, 7)).toBe("none");
});

test("cobra periodos otorgados según el plan", () => {
  const plan = { price_cents: 1250, billing_unit: "per_class", is_first_class: false };
  const membership = { status: "active", periods_paid: 1, current_period_start: today };
  expect(chargeForPeriod(plan, membership)).toEqual({ amount_cents: 1250, due_on: today, period_index: 1 });
  expect(chargeForPeriod({ ...plan, price_cents: 0, is_first_class: true }, membership)).toBeNull();
  expect(chargeForPeriod(plan, { ...membership, status: "cancelled" })).toBeNull();
  expect(chargeForPeriod(plan, { ...membership, periods_paid: 2 })).toBeNull();
});

test("reporte ordenado con totales y cobro pendiente del siguiente periodo", () => {
  const client = { id: "client", name: "Ana" };
  const payment = { id: "current", client, plan: "Plan", amount_cents: 1250, membership: "m1",
    period_index: 1, status: "pending", due_on: "2026-11-20" };
  const membership = { id: "m1", client, plan: "Plan", status: "active", current_period_end: "2026-11-20", periods_paid: 1 };
  const report = buildDueReport([
    payment,
    { ...payment, id: "older", due_on: "2026-11-19" },
    { ...payment, id: "next", period_index: 2, due_on: today },
    { ...payment, id: "paid", status: "paid" },
    { ...payment, id: "void", status: "void" },
  ], [
    membership,
    { ...membership, id: "m2", current_period_end: today },
    { ...membership, id: "m3", status: "paused" },
    { ...membership, id: "m4", status: "cancelled" },
  ], today, 7);
  expect(report.overdue.map(p => [p.id, p.days_overdue])).toEqual([["older", 2], ["current", 1]]);
  expect(report.upcoming.map(p => [p.id, p.days_until])).toEqual([["next", 0]]);
  expect(report.renewals.map(m => [m.state, m.has_pending_payment])).toEqual([["lapsed", true], ["ending_soon", false]]);
  expect(report.totals).toEqual({
    overdue_cents: 2500, upcoming_cents: 1250, overdue_count: 2, upcoming_count: 1, renewals_count: 2,
  });
});
