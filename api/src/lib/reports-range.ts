// Reuse the business timezone and civil calendar from tz.ts.
import { addLocalDays, localWeekday, startOfLocalDay, utcToLocal } from "./tz";

const DAY_MS = 86_400_000;

export type GroupBy = "day" | "week" | "month";
export type ReportRange = {
  from: string;
  to: string;
  timezone: string;
  start_utc: string;
  end_utc: string;
};

export class ReportRangeError extends Error {}

export function localDateToUtc(date: string, timezone: string): string {
  return startOfLocalDay(date, timezone);
}

export function parseRange(from: string, to: string, timezone: string): ReportRange {
  let start: string;
  let end: string;
  try {
    start = localDateToUtc(from, timezone);
    end = localDateToUtc(addLocalDays(to, 1), timezone);
  } catch {
    throw new ReportRangeError("Indica fechas válidas en formato AAAA-MM-DD.");
  }
  if (to < from) throw new ReportRangeError("La fecha final debe ser igual o posterior a la inicial.");
  if (rangeDays({ from, to }) > 366) throw new ReportRangeError("El rango admite hasta 366 días.");
  return { from, to, timezone, start_utc: start, end_utc: end };
}

export function rangeDays({ from, to }: Pick<ReportRange, "from" | "to">): number {
  return (Date.parse(to) - Date.parse(from)) / DAY_MS + 1;
}

export function utcToLocalParts(iso: string, timezone: string) {
  const { date, time, weekday } = utcToLocal(iso, timezone);
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return { date, time, year, month, day, hour, minute, weekday };
}

export function localBucketKey(date: string, groupBy: GroupBy): string {
  switch (groupBy) {
    case "day": return date;
    case "week": return addLocalDays(date, -localWeekday(date));
    case "month": return date.slice(0, 7);
  }
}

export function bucketKey(iso: string, groupBy: GroupBy, timezone: string): string {
  return localBucketKey(utcToLocal(iso, timezone).date, groupBy);
}

export function listBuckets(range: ReportRange, groupBy: GroupBy): string[] {
  const keys = new Set<string>();
  for (let date = range.from; date <= range.to; date = addLocalDays(date, 1)) {
    keys.add(localBucketKey(date, groupBy));
  }
  return [...keys];
}
