import { expect, test } from "bun:test";
import { blockRangeUtc, generateSessions, sessionKey } from "./schedule-gen";
import { utcToLocal } from "./tz";

const slots = [
  [1, "19:30"], [3, "19:30"], [6, "09:00"],
  [2, "09:00"], [2, "17:30"], [2, "19:00"],
  [4, "09:00"], [4, "17:30"], [4, "19:00"],
] as const;
const input = {
  templates: slots.map(([weekday, start_time], index) => ({
    id: String(index), service: index < 3 ? "jump" : "strength", weekday, start_time,
    duration_min: 60, capacity: index < 3 ? 12 : 6, coach: index === 0 ? "override" : "", active: true,
  })),
  services: new Map([
    ["jump", { active: true, default_coach: "fallback" }],
    ["strength", { active: true, default_coach: "" }],
  ]),
  from: "2026-10-25", weeks: 4, blocks: [], existingKeys: new Set<string>(),
};

test("generates 36 unique slots across DST and keeps existing keys", () => {
  const { toCreate } = generateSessions(input);
  expect(toCreate).toHaveLength(36);
  const existingKeys = new Set(toCreate.map((slot) => sessionKey(slot.template, slot.starts_at)));
  expect(existingKeys.size).toBe(36);
  expect(generateSessions({ ...input, existingKeys })).toEqual({
    toCreate: [], skippedExisting: 36, skippedBlocked: 0,
  });
  expect(toCreate.filter((slot) => slot.template === "0").slice(0, 2).map((slot) => slot.starts_at))
    .toEqual(["2026-10-26T23:30:00.000Z", "2026-11-03T00:30:00.000Z"]);
  expect(toCreate[0].coach).toBe("override");
  expect(toCreate.find((slot) => slot.template === "1")?.coach).toBe("fallback");
});

test("blocks both bounds and uses local midnights even on the fall transition", () => {
  const blocks = [
    { date_from: "2026-10-26", date_to: "2026-10-26" },
    { date_from: "2026-10-31", date_to: "2026-11-03" },
  ];
  const { toCreate, skippedBlocked } = generateSessions({ ...input, blocks });
  expect(skippedBlocked).toBe(6);
  const dates = toCreate.map((slot) => utcToLocal(slot.starts_at).date);
  for (const date of ["2026-10-26", "2026-10-31", "2026-11-02", "2026-11-03"]) {
    expect(dates).not.toContain(date);
  }
  expect(blockRangeUtc({ date_from: "2026-11-01", date_to: "2026-11-01" }))
    .toEqual({ from: "2026-11-01T04:00:00.000Z", to: "2026-11-02T05:00:00.000Z" });
});

test("ignores inactive templates and services", () => {
  const templates = [{ ...input.templates[0], active: false }, ...input.templates.slice(1)];
  const services = new Map(input.services);
  services.set("strength", { active: false, default_coach: "" });
  expect(generateSessions({ ...input, templates, services }).toCreate).toHaveLength(8);
});
