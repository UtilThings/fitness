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
