import { expect, test } from "bun:test";
import {
  canUseFirstClass, checkBookingEligibility, computeBalance, creditsToApply,
  creditsToGrant, localWeekKey, requiresCredit,
} from "./credits";

const pack = { billing_unit: "per_4_weeks", sessions: 12, per_week: 0 };
const unlimited = { ...pack, sessions: 0 };
const first = { ...pack, billing_unit: "first_visit" };

test("otorga los créditos según el plan", () => {
  expect(creditsToGrant(pack)).toBe(12);
  expect(creditsToGrant(unlimited)).toBeNull();
  expect(creditsToGrant({ ...unlimited, per_week: 3 })).toBeNull();
  expect(creditsToGrant({ ...pack, billing_unit: "per_class" })).toBe(1);
  expect(creditsToGrant(first)).toBe(1);
  expect(canUseFirstClass({ free_class_used: false }, [])).toBe(true);
  expect(canUseFirstClass({ free_class_used: true }, [])).toBe(false);
  expect(canUseFirstClass({ free_class_used: false }, [first])).toBe(false);
});

test("reconcilia cargos y correcciones de forma idempotente", () => {
  expect(creditsToApply("attended", 0)).toEqual({ delta: -1, reason: "attend" });
  expect(creditsToApply("attended", -1)).toBeNull();
  expect(creditsToApply("late_cancelled", 0)).toEqual({ delta: -1, reason: "late_cancel" });
  expect(creditsToApply("no_show", 0)).toEqual({ delta: -1, reason: "late_cancel" });
  expect(creditsToApply("cancelled", -1)).toEqual({ delta: 1, reason: "adjust" });
  expect(computeBalance([{ delta: 1 }, { delta: -2 }])).toBe(-1);
});

test("descuenta reservas comprometidas y aplica el límite semanal incluso en ilimitados", () => {
  const input = {
    membership: { status: "active", credits_balance: 2 },
    plan: pack, committedBookings: 2, weekBookings: 3,
  };
  expect(checkBookingEligibility(input)).toEqual({ allowed: false, code: "no_credits", available: 0 });
  expect(checkBookingEligibility({ ...input, committedBookings: 3, override: true }))
    .toEqual({ allowed: true, code: "overridden", available: -1 });
  expect(checkBookingEligibility({ ...input, plan: unlimited }).allowed).toBe(true);
  expect(checkBookingEligibility({ ...input, plan: { ...unlimited, per_week: 3 } }))
    .toEqual({ allowed: false, code: "weekly_limit", available: null });
  expect(checkBookingEligibility({ ...input, membership: null }).code).toBe("no_membership");
  expect(checkBookingEligibility({ ...input, membership: { ...input.membership, status: "paused" } }).code)
    .toBe("membership_not_active");
});

test("semanas locales cruzan el mes y las sesiones especiales y online se excluyen", () => {
  expect(localWeekKey("2026-02-01")).toBe("2026-01-26");
  expect(localWeekKey("2026-02-02")).toBe("2026-02-02");
  expect(requiresCredit({ kind: "regular" }, { kind: "group" })).toBe(true);
  expect(requiresCredit({ kind: "private" }, { kind: "personal" })).toBe(true);
  expect(requiresCredit({ kind: "special" }, { kind: "group" })).toBe(false);
  expect(requiresCredit({ kind: "regular" }, { kind: "online" })).toBe(false);
});
