import { expect, test } from "bun:test";
import { formatReceipt, isValidReceipt, localYear, nextSequence, parseReceipt } from "./receipt-number";

test("formato, validación y vuelta al número de origen", () => {
  expect(formatReceipt("JQ", 2026, 42)).toBe("JQ-2026-000042");
  expect(parseReceipt(formatReceipt("JQ", 2027, 999999), "JQ")).toEqual({ year: 2027, seq: 999999 });
  expect(parseReceipt("JQ-2026-000042", "JQ")).toEqual({ year: 2026, seq: 42 });
  expect(isValidReceipt("JQ-2026-000042", "JQ")).toBe(true);
  for (const text of ["JQ-2026-12", "jq-2026-000042", "JQ-26-000042", "JQ-2026-000000", "JQ-2026-000042\n"]) {
    expect(parseReceipt(text, "JQ")).toBeNull();
  }
  expect(() => formatReceipt("JQ", 10000, 1)).toThrow();
  expect(() => formatReceipt("JQ", 2026, 0)).toThrow();
});

test("avance de secuencia y cambio de año local", () => {
  expect(nextSequence(0)).toBe(1);
  expect(nextSequence(999998)).toBe(999999);
  expect(() => nextSequence(999999)).toThrow();
  expect(() => nextSequence(-1)).toThrow();
  expect(localYear("2026-12-31")).toBe(2026);
  expect(localYear("2027-01-01")).toBe(2027);
  expect(() => localYear("2026-02-29")).toThrow();
});

test("validates the configured business prefix", () => {
  expect(formatReceipt("BOG1", 2026, 1)).toBe("BOG1-2026-000001");
  expect(isValidReceipt("BOG1-2026-000001", "BOG1")).toBe(true);
  expect(isValidReceipt("BOG1-2026-000001", "JQ")).toBe(false);
  expect(() => formatReceipt("BOG*", 2026, 1)).toThrow();
});
