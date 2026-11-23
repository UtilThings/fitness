import { diffDays, isRenewalPending } from "./membership-cycles";

type Customer = { id: string; name: string };
type DuePayment = {
  id: string;
  client: Customer;
  plan: string;
  membership: string;
  period_index: number;
  amount_cents: number;
  status: string;
  due_on: string;
};
type DueMembership = {
  id: string;
  client: Customer;
  plan: string;
  status: string;
  current_period_end: string;
  periods_paid: number;
};

export function classifyDue(dueOn: string, today: string, windowDays: number) {
  const days = diffDays(dueOn, today);
  if (!Number.isFinite(days)) return "none";
  if (days < 0) return "overdue";
  return days <= windowDays ? "due_soon" : "future";
}

export function chargeForPeriod(
  plan: { price_cents: number; billing_unit: string; is_first_class: boolean },
  membership: { status: string; periods_paid: number; current_period_start: string },
) {
  const { periods_paid, current_period_start, status } = membership;
  if (plan.price_cents <= 0 || plan.is_first_class || status === "cancelled" ||
      periods_paid < 1 || (plan.billing_unit === "per_class" && periods_paid !== 1)) {
    return null;
  }
  return { amount_cents: plan.price_cents, due_on: current_period_start, period_index: periods_paid };
}

export function buildDueReport(payments: DuePayment[], memberships: DueMembership[], today: string, days: number) {
  const overdue = [];
  const upcoming = [];
  const pendingPeriods = new Set<string>();
  const ordered = [...payments].sort((a, b) => a.due_on.localeCompare(b.due_on) || a.id.localeCompare(b.id));
  for (const { id, client, plan, membership, period_index, amount_cents, status, due_on } of ordered) {
    if (status !== "pending") continue;
    if (membership) pendingPeriods.add(`${membership}:${period_index}`);
    const classification = classifyDue(due_on, today, days);
    const entry = { id, client, amount_cents, due_on, plan };
    if (classification === "overdue") overdue.push({ ...entry, days_overdue: diffDays(today, due_on) });
    if (classification === "due_soon") upcoming.push({ ...entry, days_until: diffDays(due_on, today) });
  }

  const renewals = memberships
    .filter(m => m.status === "active" &&
      ["overdue", "due_soon"].includes(classifyDue(m.current_period_end, today, days)))
    .sort((a, b) => a.current_period_end.localeCompare(b.current_period_end) || a.id.localeCompare(b.id))
    .map(m => ({
      membership: m.id,
      client: m.client,
      plan: m.plan,
      period_end: m.current_period_end,
      state: isRenewalPending(m, today) ? "lapsed" as const : "ending_soon" as const,
      has_pending_payment: pendingPeriods.has(`${m.id}:${m.periods_paid + 1}`),
    }));

  return {
    today, overdue, upcoming, renewals,
    totals: {
      overdue_cents: overdue.reduce((total, p) => total + p.amount_cents, 0),
      upcoming_cents: upcoming.reduce((total, p) => total + p.amount_cents, 0),
      overdue_count: overdue.length,
      upcoming_count: upcoming.length,
      renewals_count: renewals.length,
    },
  };
}
