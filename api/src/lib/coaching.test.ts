import { expect, test } from "bun:test";
import {
  adherenceSummary, endsOn, needsCheckin, programFlags, programWeek,
  renewalAlert, validateCheckin, validateProgramInput,
} from "./coaching";

const program = { starts_on: "2026-01-05", duration_weeks: 12, status: "active" };
const checkins = (...values: number[]) => values.map((adherence, index) => ({
  adherence, checked_at: `2026-02-${String(20 - index).padStart(2, "0")}`,
})).reverse();

test("calcula el fin y acota la semana a la duración acordada", () => {
  expect(endsOn("2026-01-05", 12)).toBe("2026-03-30");
  expect(programWeek(program, "2026-01-05")).toEqual({ week: 1, total: 12 });
  expect(programWeek(program, "2026-03-29").week).toBe(12);
  expect(programWeek({ ...program, status: "ended" }, "2026-08-05").week).toBe(12);
});

test("ordena los check-ins, promedia cuatro y compara con hasta cuatro anteriores", () => {
  expect(adherenceSummary([])).toEqual({ average: null, lastFour: [], trend: "flat", atRisk: false });
  expect(adherenceSummary(checkins(2, 4, 4, 4, 1, 3))).toEqual({
    average: 3.5, lastFour: [2, 4, 4, 4], trend: "up", atRisk: true,
  });
  expect(adherenceSummary(checkins(2, 1, 1, 1, 3)).trend).toBe("down");
  expect(adherenceSummary(checkins(3, 3, 3, 3, 3)).trend).toBe("flat");
  expect(adherenceSummary(checkins(4, 3, 2, 1, 2, 2, 2, 2, 5)).trend).toBe("up");
});

test("los check-ins de la misma fecha se ordenan por registro", () => {
  expect(adherenceSummary([
    { checked_at: "2026-02-20", adherence: 5, created: "2026-02-20 16:00:00.000Z" },
    { checked_at: "2026-02-20", adherence: 2, created: "2026-02-20 17:00:00.000Z" },
  ])).toMatchObject({ lastFour: [2, 5], atRisk: true });
});

test("la cadencia se supera en el día ocho y se reinicia con el último check-in", () => {
  expect(needsCheckin(program, null, "2026-01-12")).toBe(false);
  expect(needsCheckin(program, null, "2026-01-13")).toBe(true);
  expect(needsCheckin(program, "2026-01-07", "2026-01-13")).toBe(false);
  for (const status of ["ended", "paused"]) {
    expect(needsCheckin({ ...program, status }, null, "2026-01-13")).toBe(false);
  }
});

test("alerta en el límite de renovación y da prioridad a la membresía vencida", () => {
  const linked = { ...program, renews_on: "2026-03-30" };
  expect(renewalAlert(linked, null, "2026-03-22")).toBeNull();
  expect(renewalAlert(linked, null, "2026-03-23")).toBe("renewal_soon");
  expect(renewalAlert(linked, null, "2026-03-30")).toBe("renewal_soon");
  expect(renewalAlert(linked, null, "2026-03-31")).toBe("renewal_overdue");
  expect(renewalAlert(linked, { status: "expired" }, "2026-03-31")).toBe("membership_expired");
  expect(programFlags(linked, checkins(2), null, "2026-03-30").alerts)
    .toEqual(["renewal_soon", "checkin_due", "at_risk", "ending"]);
});

test("valida fechas reales, duración exacta y check-ins permitidos", () => {
  expect(validateProgramInput(program)).toEqual({});
  expect(validateProgramInput({ starts_on: "2026-02-30", duration_weeks: 10, status: "invalid" }))
    .toHaveProperty("starts_on");
  expect(validateProgramInput({ ...program, duration_weeks: 10 })).toHaveProperty("duration_weeks");
  expect(validateCheckin({ checked_at: "2026-02-02", adherence: 2.5 }, { status: "ended" }, "2026-02-01"))
    .toEqual(expect.objectContaining({ checked_at: expect.any(String), adherence: expect.any(String), program: expect.any(String) }));
  expect(validateCheckin({ checked_at: "2026-02-01", adherence: 5 }, program, "2026-02-01")).toEqual({});
});
