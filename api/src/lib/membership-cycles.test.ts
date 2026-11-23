import { expect, test } from "bun:test";
import {
  addDays, commitmentEnd, commitmentState, diffDays, extendByPause, isEarlyCancellation,
  isRenewalPending, nextPeriod, periodBounds, shouldExpire,
} from "./membership-cycles";

test("los ciclos tienen 28 días inclusivos y continúan al día siguiente", () => {
  expect(periodBounds("2026-01-05", 1)).toEqual({ start: "2026-01-05", end: "2026-02-01" });
  expect(nextPeriod("2026-02-01")).toEqual({ start: "2026-02-02", end: "2026-03-01" });
  expect(periodBounds("2026-01-05", 4)).toEqual({ start: "2026-03-30", end: "2026-04-26" });
});

test("las fechas cruzan años, febrero bisiesto y cambios de hora", () => {
  expect(addDays("2025-12-31", 1)).toBe("2026-01-01");
  expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
  expect(addDays("2026-03-07", 2)).toBe("2026-03-09");
  expect(diffDays("2026-11-02", "2026-10-31")).toBe(2);
});

test("compromiso y cancelación anticipada respetan el cierre inclusivo", () => {
  const m = { starts_on: "2026-01-05", commitment_periods_total: 4 };
  expect(commitmentEnd(m.starts_on, 4)).toBe("2026-04-26");
  expect(commitmentEnd(m.starts_on, 0)).toBeNull();
  expect(commitmentState({ ...m, commitment_periods_total: 0 }, "2026-01-06")).toBe("none");
  expect(isEarlyCancellation(m, "2026-04-26")).toBe(true);
  expect(commitmentState(m, "2026-04-27")).toBe("completed");
});

test("día 7 de gracia sigue activo y la pausa desplaza el cierre", () => {
  const m = { status: "active", current_period_end: "2026-02-01" };
  expect(isRenewalPending(m, "2026-02-01")).toBe(false);
  expect(isRenewalPending(m, "2026-02-02")).toBe(true);
  expect(shouldExpire(m, "2026-02-08")).toBe(false);
  expect(shouldExpire(m, "2026-02-09")).toBe(true);
  expect(shouldExpire({ ...m, status: "paused" }, "2026-02-09")).toBe(false);
  expect(extendByPause("2026-02-01", "2026-01-20", "2026-01-20")).toBe("2026-02-01");
  expect(extendByPause("2026-02-01", "2026-01-20", "2026-01-30")).toBe("2026-02-11");
});
