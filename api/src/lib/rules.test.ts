import { expect, test } from "bun:test";
import { ROLES, RULE_OWNER, RULE_STAFF, ruleAnd, ruleOr, ruleOwnerOrSelf, ruleRoles, type Role } from "./rules";

test("defines the staff and owner rules and the supported roles", () => {
  expect(ROLES).toEqual(["owner", "coach", "reception"]);
  expect(RULE_STAFF).toBe('@request.auth.collectionName = "admins" && @request.auth.active = true');
  expect(RULE_OWNER).toBe(RULE_STAFF + ' && @request.auth.role = "owner"');
});

test("groups compound expressions and omits empty ones", () => {
  expect(ruleAnd("a || b", "", "c")).toBe("(a || b) && c");
  expect(ruleOr("a && b", "c && d", " ")).toBe("(a && b) || (c && d)");
  expect(ruleAnd("a || b", " ")).toBe("a || b");
  expect(ruleOr("", " ")).toBe("");
});

test("requires staff and at least one known role", () => {
  expect(ruleRoles("owner")).toBe(RULE_OWNER);
  expect(ruleRoles("coach", "reception")).toBe(
    RULE_STAFF + ' && (@request.auth.role = "coach" || @request.auth.role = "reception")',
  );
  expect(() => ruleRoles("invalid" as Role)).toThrow("Unknown role");
  expect(() => ruleRoles()).toThrow("At least one role");
});

test("allows an owner or the active admin editing their own unlocked fields", () => {
  expect(ruleOwnerOrSelf()).toBe(`(${RULE_OWNER}) || (${RULE_STAFF} && id = @request.auth.id)`);
  expect(ruleOwnerOrSelf(["role", "active"])).toBe(
    `(${RULE_OWNER}) || (${RULE_STAFF} && id = @request.auth.id && @request.body.role:isset = false && @request.body.active:isset = false)`,
  );
});

test("admin migration uses the shared rule expressions", async () => {
  const migration = await Bun.file(
    new URL("../../pb_migrations/1795261200_updated_admins_rules.js", import.meta.url),
  ).text();

  expect(migration).toContain(`admins.listRule = '${RULE_STAFF}';`);
  expect(migration).toContain(`admins.viewRule = '${RULE_STAFF}';`);
  expect(migration).toContain(`admins.createRule = '${RULE_OWNER}';`);
  expect(migration).toContain(`admins.updateRule = '${ruleOwnerOrSelf(["role", "active"])}';`);
  expect(migration).toContain("@request.body.role:isset = false");
  expect(migration).toContain("@request.body.active:isset = false");
  expect(migration).toContain(`admins.deleteRule = '${ruleAnd(RULE_OWNER, "id != @request.auth.id")}';`);

  const auditMigration = await Bun.file(
    new URL("../../pb_migrations/1795261100_created_audit_logs.js", import.meta.url),
  ).text();
  expect(auditMigration).toContain(`const ownerRule = '${RULE_OWNER}';`);
});

test("business migration scopes every existing role rule and preserves closed operations", async () => {
  const { runInNewContext } = await import("node:vm");
  const { TENANT_COLLECTIONS } = await import("./tenant");
  const { RULE_BUSINESS_SELF, ruleBusiness } = await import("./rules");
  const source = await Bun.file(
    new URL("../../pb_migrations/1795266400_scoped_rules_by_business.js", import.meta.url),
  ).text();
  const original = { listRule: RULE_STAFF, viewRule: "", updateRule: ruleOwnerOrSelf(), deleteRule: null, createRule: RULE_OWNER };
  const collections = new Map<string, typeof original>(TENANT_COLLECTIONS.map((name) => [name, { ...original }]));
  const app = { findCollectionByNameOrId: (name: string) => {
    expect(collections.has(name)).toBe(true);
    return collections.get(name);
  }, save: () => {} };
  runInNewContext(source, { migrate: (up: Function, down: Function) => {
    up(app);
    for (const collection of collections.values()) {
      expect(collection.listRule).toBe(ruleBusiness(original.listRule));
      expect(collection.viewRule).toBe(ruleBusiness(original.viewRule));
      expect(collection.updateRule).toBe(ruleBusiness(original.updateRule));
      expect(collection.deleteRule).toBe(ruleBusiness(original.deleteRule));
      expect(collection.createRule).toBe(original.createRule);
    }
    down(app);
    for (const collection of collections.values()) expect(collection).toEqual(original);
  } });
  const businesses = await Bun.file(
    new URL("../../pb_migrations/1795266000_created_businesses.js", import.meta.url),
  ).text();
  expect(businesses).toContain(RULE_BUSINESS_SELF);
});
