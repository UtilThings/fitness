import { expect, test } from "bun:test";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { generateKey, hashKey, parseKey, verifyKey } from "./business-key";

const charset = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const crypto = {
  randomString: (length: number) => Array.from({ length }, () => charset[randomInt(charset.length)]).join(""),
  sha256: (key: string) => createHash("sha256").update(key).digest("hex"),
  equal: (a: string, b: string) => timingSafeEqual(Buffer.from(a), Buffer.from(b)),
};

test("creates independent prefixes and 32-character secrets", () => {
  const keys = Array.from({ length: 64 }, () => generateKey(crypto));
  expect(new Set(keys.map(({ prefix }) => prefix)).size).toBe(keys.length);
  expect(new Set(keys.map(({ key }) => parseKey(key)?.secret)).size).toBe(keys.length);
  for (const { key, prefix } of keys) {
    expect(parseKey(key)?.prefix).toBe(prefix);
    expect(parseKey(key)?.secret).toHaveLength(32);
  }
  expect(parseKey(keys[0].key + "\n")).toBeNull();
});

test("hashes the full key and compares equal-length digests on failure", () => {
  const older = generateKey(crypto).key;
  const current = generateKey(crypto).key;
  const hash = hashKey(current, crypto);
  expect(hash).toMatch(/^[a-f\d]{64}$/);
  expect(verifyKey(current, hash, crypto)).toBe(true);
  expect(verifyKey(older, hash, crypto)).toBe(false);
  expect(verifyKey("malformed", "", crypto)).toBe(false);
});
