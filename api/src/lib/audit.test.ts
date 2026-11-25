import { expect, test } from "bun:test";
import { isAudited } from "./audit-config";
import { buildEntry, computeDiff, redact } from "./audit";

const target = { collection: "admins", recordId: "admin-1" };

test("audits admins and excludes audit logs and unregistered collections", () => {
  expect(isAudited("admins")).toBe(true);
  expect(isAudited("audit_logs")).toBe(false);
  expect(isAudited("users")).toBe(false);
});

test("omits unchanged updates, timestamps, and object key reordering", () => {
  const before = { name: "Ana", updated: "old", created: "old", settings: { a: 1, b: 2 } };
  const after = { name: "Ana", updated: "new", created: "new", settings: { b: 2, a: 1 } };
  expect(computeDiff(before, after)).toEqual({});
  expect(buildEntry({ ...target, action: "update", before, after })).toBeNull();
});

test("keeps original and new values for changes", () => {
  expect(computeDiff({ name: "Ana", active: true }, { name: "Ana María", active: false })).toEqual({
    name: { from: "Ana", to: "Ana María" },
    active: { from: true, to: false },
  });
});

test("redacts credentials recursively and keeps them out of entries and summaries", () => {
  const before = { password: "p", passwordHash: "hash", tokenKey: "token" };
  const after = {
    ...before,
    passwordConfirm: "confirm",
    profile: { old_password: "previous", sections: [{ TOKEN_KEY: "secret", title: "Public" }] },
  };
  const publicProfile = { sections: [{ title: "Public" }] };
  expect(redact(after)).toEqual({ profile: publicProfile });
  expect(buildEntry({ ...target, action: "update", before, after })).toEqual({
    actor: "",
    action: "update",
    collection: "admins",
    record_id: "admin-1",
    summary: "Record updated.",
    diff: { profile: { to: publicProfile } },
  });
  expect(buildEntry({ ...target, action: "update", before, after: { password: "new" } })).toBeNull();
});

test("registra cambios de credenciales con una marca sin incluir valores sensibles", () => {
  const entry = buildEntry({
    ...target,
    action: "update",
    credentialsChanged: true,
    before: { password: "previous", tokenKey: "old" },
    after: { password: "new", tokenKey: "current" },
  });
  expect(entry?.diff).toEqual({ credentials_changed: { to: true } });
});

test("uses only to for create and only from for delete", () => {
  const record = { name: "Ana" };
  const create = buildEntry({ ...target, action: "create", actorId: "owner-1", before: record, after: record });
  const remove = buildEntry({ ...target, action: "delete", before: record, after: record });
  expect(create?.diff).toEqual({ name: { to: "Ana" } });
  expect(create?.actor).toBe("owner-1");
  expect(remove?.diff).toEqual({ name: { from: "Ana" } });
  expect(remove?.summary).toBe("Record deleted.");
});

test("uses the audited business even when the actor belongs to another business", async () => {
  const { auditBusiness } = await import("./audit");
  expect(auditBusiness("business-a", "business-b")).toBe("business-a");
  expect(auditBusiness("", "business-b")).toBe("business-b");
  expect(auditBusiness("", "business-a", "business-b")).toBe("business-b");
});
