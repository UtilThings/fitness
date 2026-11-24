import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { TENANT_COLLECTIONS } from "./tenant";

const migrations = fileURLToPath(new URL("../../pb_migrations/", import.meta.url));

test("tenant collections match the business relation migrations", () => {
  const collections = readdirSync(migrations)
    .filter((file) => /^\d+_added_business_to_.*\.js$/.test(file))
    .flatMap((file) => {
      const source = readFileSync(migrations + file, "utf8");
      return JSON.parse(source.match(/const collections = (\[.*\]);/)![1]) as string[];
    });
  expect([...TENANT_COLLECTIONS].sort()).toEqual(collections.sort());
});

test("compares tenant ownership and rejects an absent business", async () => {
  const { assertSameBusiness, resolveBusiness } = await import("./tenant");
  const row = (business: string, name = "admins", active = true) => ({
    getString: () => business, collection: () => ({ name }), getBool: () => active,
  }) as unknown as core.Record;
  expect(assertSameBusiness(row("a"), row("a"))).toBe(true);
  expect(assertSameBusiness(row("a"), row("b"))).toBe(false);
  expect(assertSameBusiness(row(""), row(""))).toBe(false);
  expect(assertSameBusiness(row("a"))).toBe(false);
  expect(resolveBusiness(row("a"))).toBe("a");
  expect(resolveBusiness(row("a", "_superusers"))).toBe("");
  expect(resolveBusiness(row("a", "admins", false))).toBe("");
});
