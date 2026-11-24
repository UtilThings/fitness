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
