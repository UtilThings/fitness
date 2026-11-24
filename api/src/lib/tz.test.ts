import { expect, test } from "bun:test";
import { addLocalDays, localToUtc, localWeekday, nyOffsetMinutes, startOfLocalDay, utcToLocal } from "./tz";

for (const [spring, fall] of [["2026-03-08", "2026-11-01"], ["2027-03-14", "2027-11-07"]]) {
  test(`springs forward on ${spring}, including the nonexistent hour`, () => {
    expect(localToUtc(spring, "01:59", "America/New_York")).toBe(`${spring}T06:59:00.000Z`);
    expect(localToUtc(spring, "02:30", "America/New_York")).toBe(`${spring}T07:30:00.000Z`);
    expect(localToUtc(spring, "03:30", "America/New_York")).toBe(`${spring}T07:30:00.000Z`);
    expect(utcToLocal(`${spring}T06:59:59.999Z`, "America/New_York").time).toBe("01:59");
    expect(utcToLocal(`${spring}T07:00:00.000Z`, "America/New_York")).toEqual({ date: spring, time: "03:00", weekday: 0 });
    expect(nyOffsetMinutes(Date.parse(`${spring}T07:00:00.000Z`))).toBe(-240);
  });

  test(`falls back on ${fall}, choosing the earlier ambiguous hour`, () => {
    expect(localToUtc(fall, "01:30", "America/New_York")).toBe(`${fall}T05:30:00.000Z`);
    expect(localToUtc(fall, "02:00", "America/New_York")).toBe(`${fall}T07:00:00.000Z`);
    expect(utcToLocal(`${fall}T05:59:59.999Z`, "America/New_York").time).toBe("01:59");
    expect(utcToLocal(`${fall}T06:00:00.000Z`, "America/New_York")).toEqual({ date: fall, time: "01:00", weekday: 0 });
    expect(nyOffsetMinutes(Date.parse(`${fall}T06:00:00.000Z`))).toBe(-300);
  });
}

test("handles midnight and weekday on both sides of a local date boundary", () => {
  expect(startOfLocalDay("2026-03-08", "America/New_York")).toBe("2026-03-08T05:00:00.000Z");
  expect(startOfLocalDay("2026-03-09", "America/New_York")).toBe("2026-03-09T04:00:00.000Z");
  expect(utcToLocal("2026-03-08T04:59:00.000Z", "America/New_York")).toEqual({ date: "2026-03-07", time: "23:59", weekday: 6 });
  expect(localWeekday("2026-03-08")).toBe(0);
  expect(localWeekday("2026-03-08T04:59:00.000Z", "America/New_York")).toBe(6);
});

test("adds civil days across leap day and a DST transition", () => {
  expect(addLocalDays("2028-02-28", 1)).toBe("2028-02-29");
  expect(addLocalDays("2028-02-29", 1)).toBe("2028-03-01");
  expect(localToUtc("2028-02-29", "12:00", "America/New_York")).toBe("2028-02-29T17:00:00.000Z");
  expect(addLocalDays("2026-03-07", 2)).toBe("2026-03-09");
  expect(addLocalDays("2027-11-08", -2)).toBe("2027-11-06");
  expect(addLocalDays("0096-02-28", 1)).toBe("0096-02-29");
});

test("rejects invalid civil dates and times", () => {
  expect(() => startOfLocalDay("2027-02-29", "America/New_York")).toThrow(RangeError);
  expect(() => localToUtc("2026-03-08", "24:00", "America/New_York")).toThrow(RangeError);
});

test("round trips each day of 2026 and keeps the same wall time across DST", () => {
  for (let date = "2026-01-01"; date < "2027-01-01"; date = addLocalDays(date, 1)) {
    for (const time of ["09:00", "19:30"]) {
      expect(utcToLocal(localToUtc(date, time, "America/New_York"), "America/New_York")).toEqual({ date, time, weekday: localWeekday(date) });
    }
  }
  for (const [standard, summer] of [["2026-03-07", "2026-03-09"], ["2026-11-02", "2026-10-31"]]) {
    expect(localToUtc(standard, "09:00", "America/New_York")).toBe(standard + "T14:00:00.000Z");
    expect(localToUtc(summer, "09:00", "America/New_York")).toBe(summer + "T13:00:00.000Z");
    expect(localToUtc(standard, "19:30", "America/New_York")).toBe(addLocalDays(standard, 1) + "T00:30:00.000Z");
    expect(localToUtc(summer, "19:30", "America/New_York")).toBe(summer + "T23:30:00.000Z");
  }
});

test("Madrid uses EU transition dates and preserves gap and overlap policy", async () => {
  const { localDateToUtcRange } = await import("./tz");
  const tz = "Europe/Madrid";
  expect(localToUtc("2026-03-29", "02:30", tz)).toBe("2026-03-29T01:30:00.000Z");
  expect(utcToLocal("2026-03-29T01:00:00.000Z", tz).time).toBe("03:00");
  expect(localToUtc("2026-10-25", "02:30", tz)).toBe("2026-10-25T00:30:00.000Z");
  expect(utcToLocal("2026-10-25T01:00:00.000Z", tz).time).toBe("02:00");
  for (const [date, hours] of [["2026-03-29", 23], ["2026-10-25", 25]] as const) {
    const { from, to } = localDateToUtcRange(date, tz);
    expect(Date.parse(to) - Date.parse(from)).toBe(hours * 3_600_000);
  }
});

test("Los Angeles changes offset at 02:00 on both transition days", () => {
  const tz = "America/Los_Angeles";
  expect(utcToLocal("2026-03-08T10:00:00Z", tz).time).toBe("03:00");
  expect(utcToLocal("2026-11-01T09:00:00Z", tz).time).toBe("01:00");
  expect(localToUtc("2026-11-01", "01:30", tz)).toBe("2026-11-01T08:30:00.000Z");
});

test("Bogotá keeps a fixed offset throughout both transition seasons", () => {
  const tz = "America/Bogota";
  expect(localToUtc("2026-03-08", "02:30", tz)).toBe("2026-03-08T07:30:00.000Z");
  expect(localToUtc("2026-11-01", "01:30", tz)).toBe("2026-11-01T06:30:00.000Z");
  expect(() => utcToLocal("2026-03-08T10:00:00Z", "Unknown/Zone")).toThrow("Unsupported timezone");
});

test("Vancouver keeps daylight time after the last spring transition in 2026", () => {
  const timezone = "America/Vancouver";
  expect(localToUtc("2026-03-07", "09:00", timezone)).toBe("2026-03-07T17:00:00.000Z");
  expect(localToUtc("2026-11-02", "09:00", timezone)).toBe("2026-11-02T16:00:00.000Z");
  expect(localToUtc("2027-01-01", "09:00", timezone)).toBe("2027-01-01T16:00:00.000Z");
});
