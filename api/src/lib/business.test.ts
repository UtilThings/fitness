import { expect, test } from "bun:test";
import { isSupportedTimezone, validateOrigins } from "./business";

test("accepts the configured IANA zones", () => {
  expect(isSupportedTimezone("America/New_York")).toBe(true);
  expect(isSupportedTimezone("Europe/Madrid")).toBe(true);
  expect(isSupportedTimezone("America/Imaginary")).toBe(false);
});

test("validates canonical HTTP origins", () => {
  expect(validateOrigins(["https://fitness.example.test", "http://localhost:4321"])).toBeUndefined();
  for (const origin of ["https://*.example.test", "host.test", "https://host.test/", "https://host.test:65536"]) {
    expect(validateOrigins([origin])).toBeDefined();
  }
  expect(validateOrigins(["https://host.test", "https://host.test"])).toBeDefined();
  expect(validateOrigins(Array.from({ length: 11 }, (_, index) => `https://host${index}.test`))).toBeDefined();
});
