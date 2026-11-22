import { expect, test } from "bun:test";
import { canChangeFreeClass, isValidEmail, normalizeEmail, normalizePhone, normalizeSearchQuery, validateAssessment } from "./clients";

test("normaliza y valida emails opcionales", () => {
  expect(normalizeEmail(" Ana@Example.com ")).toBe("ana@example.com");
  expect(normalizeEmail()).toBe("");
  expect(isValidEmail("")).toBe(true);
  expect(isValidEmail("ana@example.com")).toBe(true);
  expect(isValidEmail("ana@")).toBe(false);
});

test("normaliza teléfonos de EE. UU. e internacionales", () => {
  for (const raw of ["(305) 555-0100", "3055550100", "13055550100", "+1 305.555.0100"]) {
    expect(normalizePhone(raw)).toEqual({ ok: true, value: "+13055550100" });
  }
  expect(normalizePhone("+57 300 123 4567")).toEqual({ ok: true, value: "+573001234567" });
  expect(normalizePhone(" ")).toEqual({ ok: true, value: "" });
  for (const raw of ["123", "+01 3055550100", "3055550100 ext 1", "+1234567890123456"]) {
    expect(normalizePhone(raw).ok).toBe(false);
  }
});

test("valida una evaluación parcial o vacía", () => {
  const value = { version: 1, completed_on: "2024-02-29", lifestyle: { sleep_hours: 7.5 } };
  expect(validateAssessment(value)).toEqual({ ok: true, errors: {}, value });
  for (const empty of [undefined, null, {}]) {
    expect(validateAssessment(empty)).toEqual({ ok: true, errors: {}, value: null });
  }
});

test("ubica claves desconocidas, tipos y rangos inválidos", () => {
  const result = validateAssessment({
    version: 2, completed_on: "2025-02-29", unknown: true,
    medical: { extra: "x", parq_cleared: "true" },
    lifestyle: { activity_level: "medium", sleep_hours: 25, stress_level: 1.5 },
    training: { days_per_week: -1 }, measurements: { height_in: 0, body_fat_pct: 110 },
  });
  expect(result.ok).toBe(false);
  expect(Object.keys(result.errors)).toEqual([
    "version", "completed_on", "unknown", "medical.extra", "medical.parq_cleared",
    "lifestyle.activity_level", "lifestyle.sleep_hours", "lifestyle.stress_level",
    "training.days_per_week", "measurements.height_in", "measurements.body_fat_pct",
  ]);
  expect(validateAssessment([]).ok).toBe(false);
});

test("solo el owner cambia la marca de clase gratis", () => {
  for (const role of ["coach", "receptionist", undefined]) {
    expect(canChangeFreeClass({ role, from: false, to: true })).toBe(false);
    expect(canChangeFreeClass({ role, from: true, to: true })).toBe(true);
  }
  expect(canChangeFreeClass({ role: "owner", from: true, to: false })).toBe(true);
});

test("separa los términos de búsqueda y extrae sus dígitos", () => {
  expect(normalizeSearchQuery(" Ana  (305) 555 ")).toEqual({ tokens: ["ana", "(305)", "555"], digits: "305555" });
});
