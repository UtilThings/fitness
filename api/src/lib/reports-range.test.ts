import { expect, test } from "bun:test";
import { bucketKey, listBuckets, localDateToUtc, parseRange, ReportRangeError } from "./reports-range";

test.each([
  ["2026-03-08", "2026-03-09", 23],
  ["2026-11-01", "2026-11-02", 25],
] as const)("local midnight on %s to %s spans %i hours", (from, next, hours) => {
  expect(Date.parse(localDateToUtc(next)) - Date.parse(localDateToUtc(from))).toBe(hours * 3_600_000);
  expect(parseRange(from, from).end_utc).toBe(localDateToUtc(next));
});

test("validates inclusive length, order and calendar dates", () => {
  expect(parseRange("2025-01-01", "2026-01-01").to).toBe("2026-01-01");
  for (const [from, to] of [
    ["2025-01-01", "2026-01-02"],
    ["2026-11-02", "2026-11-01"],
    ["2026-02-30", "2026-03-01"],
    ["2026-02-01", "2026-02-30"],
    ["2026-2-01", "2026-03-01"],
    ["", "2026-03-01"],
  ]) {
    expect(() => parseRange(from, to)).toThrow(ReportRangeError);
  }
});

test("uses the local date at UTC midnight and lists unique periods across years", () => {
  expect(bucketKey("2027-01-01T04:30:00.000Z", "day")).toBe("2026-12-31");
  const range = parseRange("2026-12-30", "2027-01-04");
  expect(listBuckets(range, "day")).toEqual([
    "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02", "2027-01-03", "2027-01-04",
  ]);
  expect(listBuckets(range, "week")).toEqual(["2026-12-27", "2027-01-03"]);
  expect(listBuckets(range, "month")).toEqual(["2026-12", "2027-01"]);
});
