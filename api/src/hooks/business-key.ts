/// <reference path="../../pb_data/types.d.ts" />

routerAdd("POST", "/api/admin/business/public-key", (e) => {
  const actor = e.auth;
  if (!actor) throw new UnauthorizedError("Sign in is required.");
  if (actor.collection().name !== "admins" || !actor.getBool("active") || actor.getString("role") !== "owner") {
    throw new ForbiddenError("Only the owner can rotate the public key.");
  }
  const { generateKey, hashKey } = require(`${__hooks}/lib/business-key`) as typeof import("../lib/business-key");
  let result: { key: string; prefix: string; rotated_at: string } | undefined;
  e.app.runInTransaction((tx) => {
    const current = tx.findRecordById("admins", actor.id);
    if (!current.getBool("active") || current.getString("role") !== "owner") {
      throw new ForbiddenError("Only the owner can rotate the public key.");
    }
    const business = tx.findRecordById("businesses", current.getString("business"));
    if (!business.getBool("active")) throw new ForbiddenError("The business is inactive.");
    for (let attempt = 0; attempt < 8; attempt++) {
      const { key, prefix } = generateKey();
      if (tx.countRecords("businesses", $dbx.hashExp({ public_key_prefix: prefix }))) continue;
      const rotated_at = new Date().toISOString();
      business.load({ public_key_prefix: prefix, public_key_hash: hashKey(key), public_key_rotated_at: rotated_at });
      business.set("@pbInternalAuditActor", actor.id);
      tx.save(business);
      tx.save(new Record(tx.findCollectionByNameOrId("audit_logs"), {
        business: business.id,
        actor: actor.id,
        action: "custom",
        collection: "businesses",
        record_id: business.id,
        summary: "Public key rotated.",
      }));
      result = { key, prefix, rotated_at };
      return;
    }
    throw new InternalServerError("Could not generate the public key.");
  });
  e.response.header().set("Cache-Control", "no-store");
  return e.json(200, result);
});
