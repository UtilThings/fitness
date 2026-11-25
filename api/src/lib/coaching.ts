import { addDays, diffDays } from "./membership-cycles";

export const CHECKIN_CADENCE_DAYS = 7;
export const PROGRAM_DURATIONS = [8, 12, 16] as const;
export const PROGRAM_STATUSES = ["active", "paused", "ended"] as const;
export type ProgramStatus = typeof PROGRAM_STATUSES[number];
export type RenewalAlert = "renewal_soon" | "renewal_overdue" | "membership_expired";
export type ProgramAlert = RenewalAlert | "checkin_due" | "at_risk" | "ending";
type ProgramInput = { starts_on: string; duration_weeks: number; status: string };
type Program = ProgramInput & { renews_on?: string };
type Checkin = { checked_at: string; adherence: number; created?: string };
type Membership = { status: string };
export type Trend = "up" | "flat" | "down";
export type ValidationErrors = Record<string, string>;

export function endsOn(startsOn: string, durationWeeks: number): string {
  return addDays(startsOn, durationWeeks * 7);
}

export function programWeek(program: ProgramInput, today: string) {
  const total = program.duration_weeks;
  const elapsed = Math.floor(diffDays(today, program.starts_on) / 7);
  return { week: Math.max(1, Math.min(total, elapsed + 1)), total };
}

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function adherenceSummary(checkins: readonly Checkin[]) {
  const ordered = [...checkins].sort((a, b) =>
    b.checked_at.localeCompare(a.checked_at) || (b.created ?? "").localeCompare(a.created ?? ""),
  );
  const lastFour = ordered.slice(0, 4).map(({ adherence }) => adherence);
  const previous = ordered.slice(4, 8).map(({ adherence }) => adherence);
  const average = lastFour.length ? mean(lastFour) : null;
  const baseline = previous.length ? mean(previous) : average;
  const trend: Trend = average === null || baseline === null || average === baseline
    ? "flat" : average > baseline ? "up" : "down";
  return { average, lastFour, trend, atRisk: lastFour[0] !== undefined && lastFour[0] <= 2 };
}

export function needsCheckin(
  program: ProgramInput,
  lastCheckinDate: string | null,
  today: string,
  cadence = CHECKIN_CADENCE_DAYS,
) {
  const since = lastCheckinDate && lastCheckinDate > program.starts_on ? lastCheckinDate : program.starts_on;
  return program.status === "active" && diffDays(today, since) > cadence;
}

export function renewalAlert(
  program: Program,
  membership: Membership | null | undefined,
  today: string,
  windowDays = 7,
): RenewalAlert | null {
  if (program.status === "ended") return null;
  if (membership?.status === "expired") return "membership_expired";
  if (!program.renews_on || program.status === "paused" || membership?.status === "paused") return null;
  const days = diffDays(program.renews_on, today);
  if (days < 0) return "renewal_overdue";
  return days <= windowDays ? "renewal_soon" : null;
}

export function programFlags(
  program: Program,
  checkins: readonly Checkin[],
  membership: Membership | null | undefined,
  today: string,
) {
  const lastCheckin = checkins.reduce<string | null>(
    (latest, { checked_at }) => !latest || checked_at > latest ? checked_at : latest, null,
  );
  const adherence = adherenceSummary(checkins);
  const end = endsOn(program.starts_on, program.duration_weeks);
  const alerts: ProgramAlert[] = [];
  const renewal = renewalAlert(program, membership, today);
  if (renewal) alerts.push(renewal);
  if (needsCheckin(program, lastCheckin, today)) alerts.push("checkin_due");
  if (program.status !== "ended" && adherence.atRisk) alerts.push("at_risk");
  if (program.status !== "ended" && today >= end && (!program.renews_on || program.renews_on <= end)) {
    alerts.push("ending");
  }
  return { ...programWeek(program, today), endsOn: end, lastCheckin, adherence, alerts };
}

function validDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const time = Date.parse(date);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === date;
}

export function validateProgramInput(input: Program): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!PROGRAM_STATUSES.some((status) => status === input.status)) errors.status = "Select a valid status.";
  if (!PROGRAM_DURATIONS.some((weeks) => weeks === input.duration_weeks)) errors.duration_weeks = "Select 8, 12, or 16 weeks.";
  if (!validDate(input.starts_on)) errors.starts_on = "Enter a valid start date.";
  if (input.renews_on && !validDate(input.renews_on)) errors.renews_on = "Enter a valid renewal date.";
  return errors;
}

export function validateCheckin(input: Checkin, program: { status: string }, today: string): ValidationErrors {
  const errors: ValidationErrors = {};
  if (program.status === "ended") errors.program = "The program has ended.";
  if (!validDate(input.checked_at) || input.checked_at > today) errors.checked_at = "Enter a valid date on or before today.";
  if (!Number.isInteger(input.adherence) || input.adherence < 1 || input.adherence > 5) errors.adherence = "Adherence must be a whole number from one to five.";
  return errors;
}
