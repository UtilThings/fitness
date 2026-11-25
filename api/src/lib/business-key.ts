/// <reference path="../../pb_data/types.d.ts" />

type Random = Pick<typeof $security, "randomString">;
type Crypto = Pick<typeof $security, "sha256" | "equal">;
const keyPattern = /^pk_([A-Za-z0-9]{8})_([A-Za-z0-9]{32})$/;

export function parseKey(key: string) {
  const parts = key.length === 44 ? keyPattern.exec(key) : null;
  return parts ? { prefix: parts[1], secret: parts[2] } : null;
}

export function generateKey(random: Random = $security) {
  const key = `pk_${random.randomString(8)}_${random.randomString(32)}`;
  const parts = parseKey(key);
  if (!parts) throw new Error("Could not generate the public key.");
  return { key, prefix: parts.prefix! };
}

export function hashKey(key: string, crypto: Pick<Crypto, "sha256"> = $security) {
  return crypto.sha256(key);
}

export function verifyKey(key: string, hash: string, crypto: Crypto = $security) {
  const valid = !!parseKey(key);
  const candidate = hashKey(valid ? key : "pk_00000000_00000000000000000000000000000000", crypto);
  const equal = crypto.equal(candidate, hash || "0".repeat(64));
  return valid && !!hash && equal;
}
