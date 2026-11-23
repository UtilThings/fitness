import { addLocalDays } from "./tz";

const DAY_MS = 86_400_000;
export const PERIOD_DAYS = 28;
export const GRACE_DAYS = 7;
export const addDays = addLocalDays;

export function diffDays(a: string, b: string): number {
  return (Date.parse(a) - Date.parse(b)) / DAY_MS;
}

export function periodBounds(startsOn: string, index: number) {
  return {
    start: addDays(startsOn, (index - 1) * PERIOD_DAYS),
    end: addDays(startsOn, index * PERIOD_DAYS - 1),
  };
}

export function nextPeriod(currentEnd: string) {
  return periodBounds(addDays(currentEnd, 1), 1);
}

export function commitmentEnd(startsOn: string, totalPeriods: number) {
  return totalPeriods > 0 ? periodBounds(startsOn, totalPeriods).end : null;
}

type Commitment = { starts_on: string; commitment_periods_total: number };
type CurrentPeriod = { status: string; current_period_end: string };

export function commitmentState(m: Commitment, today: string) {
  const end = commitmentEnd(m.starts_on, m.commitment_periods_total);
  if (!end) return "none";
  return today <= end ? "in_commitment" : "completed";
}

export function isEarlyCancellation(m: Commitment, today: string) {
  return commitmentState(m, today) === "in_commitment";
}

export function isRenewalPending(m: CurrentPeriod, today: string) {
  return m.status === "active" && today > m.current_period_end;
}

export function shouldExpire(m: CurrentPeriod, today: string, graceDays = GRACE_DAYS) {
  return m.status === "active" && diffDays(today, m.current_period_end) > graceDays;
}

export function extendByPause(periodEnd: string, pausedAt: string, today: string) {
  return addDays(periodEnd, diffDays(today, pausedAt));
}
