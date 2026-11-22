const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const STANDARD_OFFSET = -5 * 60;
const SUMMER_OFFSET = -4 * 60;

function civilUtc(year: number, month: number, day: number, hour = 0): number {
  // Date.UTC maps years 0–99 to 1900–1999. A Gregorian cycle preserves the calendar.
  if (year >= 0 && year < 100) {
    return Date.UTC(year + 400, month, day, hour) - 146_097 * DAY_MS;
  }
  return Date.UTC(year, month, day, hour);
}

function sunday(year: number, month: number, occurrence: number): number {
  const firstWeekday = new Date(civilUtc(year, month, 1)).getUTCDay();
  return 1 + (7 - firstWeekday) % 7 + (occurrence - 1) * 7;
}

export function nyOffsetMinutes(utcMs: number): number {
  const year = new Date(utcMs).getUTCFullYear();
  // The clocks change at 02:00 local, first from standard time and then from summer time.
  const starts = civilUtc(year, 2, sunday(year, 2, 2), 7);
  const ends = civilUtc(year, 10, sunday(year, 10, 1), 6);
  return utcMs >= starts && utcMs < ends ? SUMMER_OFFSET : STANDARD_OFFSET;
}

function dateMs(date: string): number {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!parts) {
    throw new RangeError("Expected a local date in YYYY-MM-DD format");
  }

  const value = civilUtc(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
  if (new Date(value).toISOString().slice(0, 10) !== date) {
    throw new RangeError(`Invalid local date: ${date}`);
  }
  return value;
}

export function localToUtc(date: string, time: string): string {
  const parts = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!parts) {
    throw new RangeError("Expected a local time in HH:mm format");
  }

  const wallTime = dateMs(date) + (Number(parts[1]) * 60 + Number(parts[2])) * MINUTE_MS;
  const summerTime = wallTime - SUMMER_OFFSET * MINUTE_MS;
  // Choose the earlier occurrence at the fall overlap. At the spring gap,
  // using the standard-time offset shifts the wall time forward by one hour.
  const utcMs = nyOffsetMinutes(summerTime) === SUMMER_OFFSET
    ? summerTime
    : wallTime - STANDARD_OFFSET * MINUTE_MS;
  return new Date(utcMs).toISOString();
}

export function utcToLocal(isoUtc: string): { date: string; time: string; weekday: number } {
  const utcMs = Date.parse(isoUtc);
  const local = new Date(utcMs + nyOffsetMinutes(utcMs) * MINUTE_MS);
  const [date, time] = local.toISOString().split("T");
  return { date, time: time.slice(0, 5), weekday: local.getUTCDay() };
}

export function localWeekday(dateOrIsoUtc: string): number {
  if (dateOrIsoUtc.includes("T")) {
    return utcToLocal(dateOrIsoUtc).weekday;
  }
  return new Date(dateMs(dateOrIsoUtc)).getUTCDay();
}

export function addLocalDays(date: string, days: number): string {
  if (!Number.isInteger(days)) {
    throw new RangeError("Expected a whole number of local days");
  }
  return new Date(dateMs(date) + days * DAY_MS).toISOString().split("T")[0];
}

export function startOfLocalDay(date: string): string {
  return localToUtc(date, "00:00");
}

export function localDateToUtcRange(date: string): { from: string; to: string } {
  return { from: startOfLocalDay(date), to: startOfLocalDay(addLocalDays(date, 1)) };
}
