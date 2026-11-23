import { reportRate } from "./reports-attendance";
import { bucketKey, listBuckets, localBucketKey, type GroupBy, type ReportRange } from "./reports-range";

export type ReportPlan = { id: string; name: string; service: string };
export type ReportService = { id: string; name: string; slug: string };
export type ReportPayment = {
  plan: string;
  status: string;
  amount_cents: number;
  paid_at: string;
  // For unpaid payments, the local due date or local void date.
  reference_on?: string;
};
export type ReportMembership = { plan: string; status: string; starts_on: string; ended_on: string };
type PeriodOptions = { range: ReportRange; groupBy: GroupBy };

function revenueCounts() {
  return { paid_cents: 0, pending_cents: 0, void_cents: 0, payments: 0 };
}

export function aggregateRevenue(
  payments: ReportPayment[], plans: ReportPlan[], services: ReportService[],
  { service, range, groupBy }: PeriodOptions & { service?: string },
) {
  const planIndex = new Map(plans.map((plan) => [plan.id, plan]));
  const serviceIndex = new Map(services.map((entry) => [entry.id, entry]));
  const totals = revenueCounts();
  const countsByPlan = new Map<string, ReturnType<typeof revenueCounts> & { plan: string; name: string }>();
  const countsByService = new Map<string, ReturnType<typeof revenueCounts> & { service: string; name: string }>();
  const periods = new Map(listBuckets(range, groupBy).map((period) => [period, { period, paid_cents: 0, payments: 0 }]));
  const start = Date.parse(range.start_utc);
  const end = Date.parse(range.end_utc);

  for (const payment of payments) {
    const { status, amount_cents, paid_at, reference_on } = payment;
    if (status === "paid") {
      const paidAt = Date.parse(paid_at);
      if (!(paidAt >= start && paidAt < end)) continue;
    } else if (
      (status !== "pending" && status !== "void") || !reference_on || reference_on < range.from || reference_on > range.to
    ) {
      continue;
    }

    const plan = planIndex.get(payment.plan);
    const relatedService = plan && serviceIndex.get(plan.service);
    if (service && service !== relatedService?.slug) continue;
    const planId = plan?.id ?? "";
    const slug = relatedService?.slug ?? "";
    const planRow = countsByPlan.get(planId) ?? { plan: planId, name: plan?.name ?? "Sin plan", ...revenueCounts() };
    const serviceRow = countsByService.get(slug) ?? {
      service: slug, name: relatedService?.name ?? "Sin servicio", ...revenueCounts(),
    };
    const amountKey = status === "paid" ? "paid_cents" : status === "pending" ? "pending_cents" : "void_cents";
    for (const row of [totals, planRow, serviceRow]) {
      row[amountKey] += amount_cents;
      row.payments++;
    }
    countsByPlan.set(planId, planRow);
    countsByService.set(slug, serviceRow);
    if (status === "paid") {
      const period = periods.get(bucketKey(paid_at, groupBy))!;
      period.paid_cents += amount_cents;
      period.payments++;
    }
  }

  return {
    totals,
    by_plan: [...countsByPlan.values()].sort((a, b) => a.name.localeCompare(b.name)),
    by_service: [...countsByService.values()].sort((a, b) => a.name.localeCompare(b.name)),
    by_period: [...periods.values()],
  };
}

function retentionCounts() {
  return { active_start: 0, new: 0, churned: 0, active_end: 0 };
}

function retentionRates<T extends ReturnType<typeof retentionCounts>>(row: T) {
  const churn_rate = reportRate(row.churned, row.active_start);
  return { ...row, churn_rate, retention_rate: reportRate(1 - churn_rate, 1) };
}

export function aggregateRetention(memberships: ReportMembership[], plans: ReportPlan[], { range, groupBy }: PeriodOptions) {
  const planIndex = new Map(plans.map((plan) => [plan.id, plan]));
  const totals = retentionCounts();
  const byPlan = new Map<string, ReturnType<typeof retentionCounts> & { plan: string; name: string }>();
  const periods = listBuckets(range, groupBy).map((period) => ({ period, new: 0, churned: 0, active_end: 0 }));
  const periodIndex = new Map(periods.map((row, index) => [row.period, index]));
  const activeChanges = new Array<number>(periods.length + 1).fill(0);

  for (const membership of memberships) {
    const start = membership.starts_on;
    const end = ["cancelled", "expired"].includes(membership.status) ? membership.ended_on : "";
    if (!start || start > range.to || (end && end < range.from)) continue;

    const plan = planIndex.get(membership.plan);
    const planId = plan?.id ?? "";
    const row = byPlan.get(planId) ?? { plan: planId, name: plan?.name ?? "Sin plan", ...retentionCounts() };
    const isNew = start >= range.from;
    const churned = !!end && end <= range.to;
    for (const counts of [totals, row]) {
      counts.active_start += Number(!isNew);
      counts.new += Number(isNew);
      counts.churned += Number(churned);
      counts.active_end += Number(!churned);
    }
    byPlan.set(planId, row);

    const firstPeriod = isNew ? periodIndex.get(localBucketKey(start, groupBy))! : 0;
    const endPeriod = churned ? periodIndex.get(localBucketKey(end, groupBy))! : periods.length;
    if (isNew) periods[firstPeriod].new++;
    if (churned) periods[endPeriod].churned++;
    activeChanges[firstPeriod]++;
    activeChanges[endPeriod]--;
  }

  let active = 0;
  periods.forEach((row, index) => {
    active += activeChanges[index];
    row.active_end = active;
  });
  return {
    totals: retentionRates(totals),
    by_plan: [...byPlan.values()].sort((a, b) => a.name.localeCompare(b.name)).map(retentionRates),
    by_period: periods,
  };
}
