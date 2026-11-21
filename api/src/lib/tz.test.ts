import { expect, test } from "bun:test";
import { addLocalDays, localToUtc, localWeekday, nyOffsetMinutes, startOfLocalDay, utcToLocal } from "./tz";

for (const [spring, fall] of [["2026-03-08", "2026-11-01"], ["2027-03-14", "2027-11-07"]]) {
  test(`springs forward on ${spring}, including the nonexistent hour`, () => {
    expect(localToUtc(spring, "01:59")).toBe(`${spring}T06:59:00.000Z`);
    expect(localToUtc(spring, "02:30")).toBe(`${spring}T07:30:00.000Z`);
    expect(localToUtc(spring, "03:30")).toBe(`${spring}T07:30:00.000Z`);
    expect(utcToLocal(`${spring}T06:59:59.999Z`).time).toBe("01:59");
    expect(utcToLocal(`${spring}T07:00:00.000Z`)).toEqual({ date: spring, time: "03:00", weekday: 0 });
    expect(nyOffsetMinutes(Date.parse(`${spring}T07:00:00.000Z`))).toBe(-240);
  });

  test(`falls back on ${fall}, choosing the earlier ambiguous hour`, () => {
    expect(localToUtc(fall, "01:30")).toBe(`${fall}T05:30:00.000Z`);
    expect(localToUtc(fall, "02:00")).toBe(`${fall}T07:00:00.000Z`);
    expect(utcToLocal(`${fall}T05:59:59.999Z`).time).toBe("01:59");
    expect(utcToLocal(`${fall}T06:00:00.000Z`)).toEqual({ date: fall, time: "01:00", weekday: 0 });
    expect(nyOffsetMinutes(Date.parse(`${fall}T06:00:00.000Z`))).toBe(-300);
  });
}

test("handles midnight and weekday on both sides of a local date boundary", () => {
  expect(startOfLocalDay("2026-03-08")).toBe("2026-03-08T05:00:00.000Z");
  expect(startOfLocalDay("2026-03-09")).toBe("2026-03-09T04:00:00.000Z");
  expect(utcToLocal("2026-03-08T04:59:00.000Z")).toEqual({ date: "2026-03-07", time: "23:59", weekday: 6 });
  expect(localWeekday("2026-03-08")).toBe(0);
  expect(localWeekday("2026-03-08T04:59:00.000Z")).toBe(6);
});

test("adds civil days across leap day and a DST transition", () => {
  expect(addLocalDays("2028-02-28", 1)).toBe("2028-02-29");
  expect(addLocalDays("2028-02-29", 1)).toBe("2028-03-01");
  expect(localToUtc("2028-02-29", "12:00")).toBe("2028-02-29T17:00:00.000Z");
  expect(addLocalDays("2026-03-07", 2)).toBe("2026-03-09");
  expect(addLocalDays("2027-11-08", -2)).toBe("2027-11-06");
  expect(addLocalDays("0096-02-28", 1)).toBe("0096-02-29");
});

test("rejects invalid civil dates and times", () => {
  expect(() => startOfLocalDay("2027-02-29")).toThrow(RangeError);
  expect(() => localToUtc("2026-03-08", "24:00")).toThrow(RangeError);
});
