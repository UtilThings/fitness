import { expect, test } from "bun:test";
import { formatReceipt, isValidReceipt, localYear, nextSequence, parseReceipt } from "./receipt-number";

test("formato, validación y vuelta al número de origen", () => {
  expect(formatReceipt(2026, 42)).toBe("JQ-2026-000042");
  expect(parseReceipt(formatReceipt(2027, 999999))).toEqual({ year: 2027, seq: 999999 });
  expect(parseReceipt("JQ-2026-000042")).toEqual({ year: 2026, seq: 42 });
  expect(isValidReceipt("JQ-2026-000042")).toBe(true);
  for (const text of ["JQ-2026-12", "jq-2026-000042", "JQ-26-000042", "JQ-2026-000000", "JQ-2026-000042\n"]) {
    expect(parseReceipt(text)).toBeNull();
  }
  expect(() => formatReceipt(10000, 1)).toThrow();
  expect(() => formatReceipt(2026, 0)).toThrow();
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
