import { expect, test } from "bun:test";
import { aggregateRetention, aggregateRevenue, type ReportPayment } from "./reports-finance";
import { parseRange } from "./reports-range";

const plans = [{ id: "p", name: "Fuerza mensual", service: "s" }];
const services = [{ id: "s", name: "Fuerza", slug: "strength" }];
const options = { range: parseRange("2026-10-01", "2027-01-31", "America/New_York"), groupBy: "month", currency: "USD" } as const;
const paid = (amount_cents: number, paid_at: string, plan = "p"): ReportPayment =>
  ({ plan, status: "paid", paid_at, amount_cents, currency: "USD" });

test("groups paid cents by local month, plan and service while reporting unpaid amounts separately", () => {
  const payments = [
    paid(8_000, "2026-11-01T03:59:59.999Z"),
    paid(10_800, "2026-11-01T04:00:00.000Z", "deleted"),
    paid(8_000, "2026-11-20T16:00:00.000Z", ""),
    paid(7, "2026-10-01T03:59:59.999Z"),
    paid(9, "2027-02-01T05:00:00.000Z"),
    { plan: "p", currency: "USD", status: "void", paid_at: "", amount_cents: 200, reference_on: "2026-12-01" },
    { plan: "p", currency: "USD", status: "pending", paid_at: "", amount_cents: 100, reference_on: "2027-01-31" },
    { plan: "p", currency: "USD", status: "pending", paid_at: "", amount_cents: 100, reference_on: "2027-02-01" },
  ];
  const result = aggregateRevenue(payments, plans, services, options);
  expect(result.totals).toEqual({ paid_cents: 26_800, void_cents: 200, pending_cents: 100, payments: 5 });
  expect(result.by_plan.map(({ name, paid_cents }) => [name, paid_cents])).toEqual([
    ["Fuerza mensual", 8_000], ["Sin plan", 18_800],
  ]);
  expect(result.by_period.map(({ period, paid_cents }) => [period, paid_cents])).toEqual([
    ["2026-10", 8_000], ["2026-11", 18_800], ["2026-12", 0], ["2027-01", 0],
  ]);
  for (const rows of [result.by_plan, result.by_service, result.by_period]) {
    expect(rows.reduce((sum, row) => sum + row.paid_cents, 0)).toBe(26_800);
  }
  expect(aggregateRevenue(payments, plans, services, { ...options, service: "strength" }).totals.paid_cents).toBe(8_000);
  expect(aggregateRevenue([
    paid(8_000_000_000_001, "2026-11-20T16:00:00Z"),
    paid(1_999_999_999_998, "2026-11-20T16:00:00Z"),
  ], plans, services, options).totals.paid_cents).toBe(9_999_999_999_999);
});

test("counts starts, cancellations, expirations and ending balances by local period", () => {
  const result = aggregateRetention([
    { plan: "p", status: "expired", starts_on: "2026-09-01", ended_on: "2026-10-01" },
    { plan: "p", status: "cancelled", starts_on: "2026-11-01", ended_on: "2026-11-21" },
    { plan: "", status: "active", starts_on: "2026-11-02", ended_on: "" },
    { plan: "p", status: "expired", starts_on: "2026-09-01", ended_on: "2026-09-30" },
    { plan: "p", status: "paused", starts_on: "2026-09-01", ended_on: "" },
  ], plans, options);
  expect(result.totals).toEqual({ active_start: 2, new: 2, churned: 2, active_end: 2, churn_rate: 1, retention_rate: 0 });
  expect(result.by_period.map(({ new: added, churned, active_end }) => [added, churned, active_end])).toEqual([
    [0, 1, 1], [2, 1, 2], [0, 0, 2], [0, 0, 2],
  ]);
  for (const key of ["active_start", "new", "churned", "active_end"] as const) {
    expect(result.by_plan.reduce((sum, row) => sum + row[key], 0)).toBe(result.totals[key]);
  }
  expect(aggregateRetention([], plans, options).totals).toMatchObject({ churn_rate: 0, retention_rate: 1 });
});

test("keeps recorded civil dates and rejects mixed currencies", () => {
  const row = { ...paid(500, "2026-11-01T00:00:00.000Z"), paid_on: "2026-11-01" };
  expect(aggregateRevenue([row], plans, services, options).by_period[1].paid_cents).toBe(500);
  expect(() => aggregateRevenue([row, { ...row, currency: "COP" }], plans, services, options))
    .toThrow("El rango incluye pagos en otra moneda.");
});
