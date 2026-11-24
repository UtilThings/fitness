import { expect, test } from "bun:test";
import { availability } from "../../../web/src/lib/data";
import { availabilityStatus, buildCatalog, buildSchedule, normalizeWeek, PublicQueryError } from "./public-catalog";

const service = { id: "service", slug: "group-strength", kind: "group", name: "Group Strength", active: true, sort: 5 } as const;
const plan = {
  service: service.id, name: "8-Class Pack", price_cents: 26000, billing_unit: "per_4_weeks",
  sessions: 8, per_week: 2, commitment_periods: 0, is_first_class: false,
  active: true, sort: 5, notes: "Internal", email: "internal@example.test",
} as const;
const template = { service: service.id, coach: "coach", active: true, weekday: 2, start_time: "09:00", capacity: 6 };
const coaches = new Map([["coach", "Coach JQ"]]);

test("normalizes Sunday, Saturday, and year boundaries and clamps old weeks", () => {
  for (const day of ["15", "19", "21", "01"]) expect(normalizeWeek(`2026-11-${day}`, "2026-11-18")).toBe("2026-11-15");
  expect(normalizeWeek(undefined, "2026-11-18")).toBe("2026-11-15");
  expect(normalizeWeek("2027-01-02", "2026-12-27")).toBe("2026-12-27");
  expect(normalizeWeek("2027-01-16", "2026-11-18")).toBe("2027-01-10");
});

test("rejects invalid weeks and dates past the maximum", () => {
  for (const value of ["2026-02-30", "2026-2-01", "", "2027-01-17", "2099-01-01"]) {
    expect(() => normalizeWeek(value, "2026-11-18")).toThrow(PublicQueryError);
  }
});

test("availability matches the website at each threshold", () => {
  for (const spots of [-1, 0, 1, 2, 3]) expect(availabilityStatus(spots)).toBe(availability(spots));
});

test("catalog returns exactly the public fields of active services, plans, and templates in order", () => {
  const result = buildCatalog([
    service, { ...service, id: "first", slug: "first", sort: 0 },
    { ...service, id: "inactive", active: false },
  ], [
    plan, { ...plan, name: "First", sort: 0 }, { ...plan, active: false },
    { ...plan, service: "inactive" },
  ], [template, { ...template, active: false }], coaches, "America/New_York");
  const expectedPlan = {
    name: plan.name, price_cents: 26000, billing_unit: "per_4_weeks", sessions: 8, per_week: 2,
    commitment_periods: 0, is_first_class: false, partner: false, note: "",
  };
  expect(result).toEqual({
    version: 1, currency: "USD", services: [
      { slug: "first", kind: "group", name: service.name, plans: [], weekly_times: [] },
      { slug: service.slug, kind: "group", name: service.name, plans: [{ ...expectedPlan, name: "First" }, expectedPlan],
        weekly_times: [{ weekday: 2, time: "09:00", coach_name: "Coach JQ", capacity: 6 }] },
    ],
  });
});

test("schedule excludes private, cancelled and inactive services and returns exactly the public fields on DST dates", () => {
  for (const [date, hour] of [["2026-03-08", "13"], ["2026-11-01", "14"]]) {
    const session = {
      id: "session", service: service.id, coach: "coach", capacity: 6, kind: "special", status: "scheduled",
      starts_at: `${date} ${hour}:00:00.000Z`, client: "internal", notes: "internal",
    };
    const sessions = [session, { ...session, kind: "private" }, { ...session, status: "cancelled" },
      { ...session, service: "inactive" }, { ...session, starts_at: `${date} 01:00:00.000Z` }];
    const result = buildSchedule(date, sessions, new Map([[session.id, 9]]),
      [service, { ...service, id: "inactive", active: false }], coaches, "America/New_York");
    expect(result).toEqual({
      version: 1, timezone: "America/New_York", week_start: date,
      week_end: date === "2026-03-08" ? "2026-03-14" : "2026-11-07",
      sessions: [{
        local_date: date, local_time: "09:00", service: { slug: service.slug, name: service.name },
        coach_name: "Coach JQ", capacity: 6, spots_left: 0, status: "full",
      }],
    });
  }
});
