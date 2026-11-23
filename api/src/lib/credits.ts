import { addDays } from "./membership-cycles";

export type CreditPlan = {
  billing_unit: string;
  sessions: number;
  per_week: number;
  is_first_class?: boolean;
};
export type CreditReason = "grant" | "attend" | "late_cancel" | "adjust" | "expire";

export function isFirstVisit(plan: Pick<CreditPlan, "billing_unit" | "is_first_class">) {
  return plan.billing_unit === "first_visit" || plan.is_first_class === true;
}

export function creditsToGrant(plan: CreditPlan): number | null {
  if (isFirstVisit(plan) || plan.billing_unit === "per_class") return 1;
  return plan.sessions || null;
}

export function reasonFor(status: string): "attend" | "late_cancel" | null {
  if (status === "attended") return "attend";
  if (status === "late_cancelled" || status === "no_show") return "late_cancel";
  return null;
}

export function chargedAmount(status: string): number {
  return reasonFor(status) ? -1 : 0;
}

export function creditsToApply(status: string, alreadyApplied: number) {
  const delta = chargedAmount(status) - alreadyApplied;
  const reason = delta < 0 ? reasonFor(status) ?? "adjust" : "adjust";
  return delta === 0 ? null : { delta, reason };
}

export function computeBalance(movements: readonly { delta: number }[]) {
  return movements.reduce((balance, movement) => balance + movement.delta, 0);
}

export function requiresCredit(session: { kind: string }, service: { kind: string }) {
  return ["regular", "private"].includes(session.kind) && ["group", "personal"].includes(service.kind);
}

type MembershipBalance = { status: string; credits_balance: number };
export type EligibilityCode = "ok" | "no_membership" | "membership_not_active" | "no_credits" | "weekly_limit" | "overridden";
export type Eligibility = { allowed: boolean; code: EligibilityCode; available: number | null };

export function availableCredits(membership: MembershipBalance, committedBookings: number) {
  return membership.credits_balance - committedBookings;
}

export function localWeekKey(date: string) {
  const weekday = new Date(date + "T00:00:00Z").getUTCDay();
  return addDays(date, -((weekday + 6) % 7));
}

export function canUseFirstClass(
  client: { free_class_used: boolean },
  memberships: readonly Pick<CreditPlan, "billing_unit" | "is_first_class">[],
) {
  return !client.free_class_used && !memberships.some(isFirstVisit);
}

export function checkBookingEligibility(input: {
  membership?: MembershipBalance | null;
  plan?: CreditPlan | null;
  committedBookings: number;
  weekBookings: number;
  override?: boolean;
}): Eligibility {
  const { membership, plan, committedBookings, weekBookings, override } = input;
  const decide = (code: EligibilityCode, available: number | null): Eligibility =>
    code === "ok" ? { allowed: true, code, available }
      : override ? { allowed: true, code: "overridden", available }
      : { allowed: false, code, available };
  if (!membership || !plan) return decide("no_membership", 0);
  if (membership.status !== "active") return decide("membership_not_active", 0);

  const available = creditsToGrant(plan) === null ? null : availableCredits(membership, committedBookings);
  if (plan.per_week > 0 && weekBookings >= plan.per_week) return decide("weekly_limit", available);
  return decide(available !== null && available <= 0 ? "no_credits" : "ok", available);
}
