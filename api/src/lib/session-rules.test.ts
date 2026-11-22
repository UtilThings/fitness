import { expect, test } from "bun:test";
import { canTransition, isCancellationTransition, validateCancelReason, validateMove } from "./session-rules";

test("allows only the declared session transitions", () => {
  expect(canTransition("scheduled", "cancelled")).toBe(true);
  expect(canTransition("scheduled", "completed")).toBe(true);
  expect(canTransition("cancelled", "scheduled", "owner")).toBe(true);
  expect(canTransition("cancelled", "scheduled", "reception")).toBe(false);
  expect(canTransition("cancelled", "completed", "owner")).toBe(false);
  expect(canTransition("completed", "scheduled", "owner")).toBe(false);
  expect(isCancellationTransition("scheduled", "cancelled")).toBe(true);
  expect(isCancellationTransition("cancelled", "cancelled")).toBe(false);
});

test("validates cancellation reasons and future UTC dates", () => {
  expect(validateCancelReason("  no  ")).toBeString();
  expect(validateCancelReason("X".repeat(201))).toBeString();
  expect(validateCancelReason("Coach enfermo")).toBeNull();
  const valid = { now: Date.parse("2026-02-01T00:00:00Z"), startsAt: "2026-02-27T10:00:00Z" };
  expect(validateMove(valid)).toBeNull();
  expect(validateMove({ ...valid, startsAt: "2026-02-30T10:00:00Z" })).toBeString();
  expect(validateMove({ ...valid, now: Date.parse(valid.startsAt) })).toBeString();
  expect(validateMove({ ...valid, blocked: true })).toBeString();
  expect(validateMove({ ...valid, conflict: true })).toBeString();
});
