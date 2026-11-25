import { describe, expect, test } from "bun:test";
import { ADMIN_REFERENCES, canDeleteAdmin, checkAdminChange } from "./team-guards";

const owner = { id: "owner", role: "owner", active: true };
const lastOwner = { status: 400, message: "At least one active owner must remain." };

describe("checkAdminChange", () => {
  test.each([
    { role: "coach" },
    { active: false },
    { role: "reception", active: false },
  ])("protege el último owner ante %j", (change) => {
    const after = { ...owner, ...change };
    expect(checkAdminChange({ before: owner, after, activeOwners: 1 })).toEqual(lastOwner);
    expect(checkAdminChange({ before: owner, after, activeOwners: 2 })).toBeNull();
  });

  test("impide desactivarse con otro owner activo", () => {
    expect(checkAdminChange({
      before: owner,
      after: { ...owner, active: false },
      actorId: owner.id,
      activeOwners: 2,
    })).toEqual({ status: 400, message: "You cannot deactivate your own account." });
  });

  test("impide la degradación propia del último owner y permite cambios de perfil", () => {
    expect(checkAdminChange({
      before: owner, after: { ...owner, role: "coach" }, actorId: owner.id, activeOwners: 1,
    })).toEqual(lastOwner);
    expect(checkAdminChange({
      before: owner, after: owner, actorId: owner.id, activeOwners: 1,
    })).toBeNull();
  });
});

describe("canDeleteAdmin", () => {
  test("protege al último owner y al actor", () => {
    expect(canDeleteAdmin({ referencesCount: 1, isLastOwner: true, isSelf: true })).toEqual(lastOwner);
    expect(canDeleteAdmin({ referencesCount: 0, isLastOwner: false, isSelf: true })?.status).toBe(400);
  });

  test("distingue una baja con historial de un registro sin referencias", () => {
    expect(ADMIN_REFERENCES).toContainEqual({ collection: "audit_logs", field: "actor" });
    expect(ADMIN_REFERENCES).toContainEqual({ collection: "bookings", field: "marked_by" });
    expect(canDeleteAdmin({ referencesCount: 2, isLastOwner: false, isSelf: false })).toEqual({
      status: 409, message: "This team member has related records. Deactivate them instead.",
    });
    expect(canDeleteAdmin({ referencesCount: 0, isLastOwner: false, isSelf: false })).toBeNull();
  });
});

test("counts active owners only in the affected business", async () => {
  const { countActiveOwners } = await import("./team-guards");
  const owners = [{ business: "a", role: "owner", active: true }, { business: "b", role: "owner", active: true }];
  const previous = Object.getOwnPropertyDescriptor(globalThis, "$dbx");
  Object.defineProperty(globalThis, "$dbx", { configurable: true, value: { hashExp: (value: object) => value } });
  try {
    const app = {
      countRecords: (_collection: string, filters: object) =>
        owners.filter((owner) => Object.entries(filters).every(([key, value]) => owner[key as keyof typeof owner] === value)).length,
    } as unknown as Pick<core.App, "countRecords">;
    expect(countActiveOwners(app, "a")).toBe(1);
    owners.push({ business: "a", role: "owner", active: true });
    expect(countActiveOwners(app, "a")).toBe(2);
    expect(countActiveOwners(app, "b")).toBe(1);
  } finally {
    if (previous) Object.defineProperty(globalThis, "$dbx", previous);
    else Reflect.deleteProperty(globalThis, "$dbx");
  }
});
