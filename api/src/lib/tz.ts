const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

type Zone = { standard: number; rule?: "north-america" | "europe" | "vancouver" };
const zones: Record<string, Zone> = {
  UTC: { standard: 0 },
  "America/New_York": { standard: -300, rule: "north-america" },
  "America/Chicago": { standard: -360, rule: "north-america" },
  "America/Denver": { standard: -420, rule: "north-america" },
  "America/Los_Angeles": { standard: -480, rule: "north-america" },
  "America/Phoenix": { standard: -420 },
  "America/Toronto": { standard: -300, rule: "north-america" },
  "America/Vancouver": { standard: -480, rule: "vancouver" },
  "America/Mexico_City": { standard: -360 },
  "America/Bogota": { standard: -300 },
  "America/Costa_Rica": { standard: -360 },
  "Europe/London": { standard: 0, rule: "europe" },
  "Europe/Paris": { standard: 60, rule: "europe" },
  "Europe/Madrid": { standard: 60, rule: "europe" },
  "Europe/Berlin": { standard: 60, rule: "europe" },
};

export const SUPPORTED_TIMEZONES = Object.keys(zones);

function zoneFor(timezone: string): Zone {
  if (!Object.prototype.hasOwnProperty.call(zones, timezone)) throw new RangeError("The time zone is unsupported.");
  return zones[timezone];
}

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

function lastSunday(year: number, month: number): number {
  const last = new Date(civilUtc(year, month + 1, 0));
  return last.getUTCDate() - last.getUTCDay();
}

export function offsetMinutes(utcMs: number, timezone: string): number {
  const { standard, rule } = zoneFor(timezone);
  if (!rule) return standard;
  const year = new Date(utcMs).getUTCFullYear();
  const daylight = standard + 60;
  // Europe changes at 01:00 UTC. North America changes at 02:00 local.
  const starts = rule === "europe"
    ? civilUtc(year, 2, lastSunday(year, 2), 1)
    : civilUtc(year, 2, sunday(year, 2, 2), 2) - standard * MINUTE_MS;
  if (rule === "vancouver" && year >= 2026) {
    return year > 2026 || utcMs >= starts ? daylight : standard;
  }
  const ends = rule === "europe"
    ? civilUtc(year, 9, lastSunday(year, 9), 1)
    : civilUtc(year, 10, sunday(year, 10, 1), 2) - daylight * MINUTE_MS;
  return utcMs >= starts && utcMs < ends ? daylight : standard;
}

export function nyOffsetMinutes(utcMs: number): number {
  return offsetMinutes(utcMs, "America/New_York");
}

function dateMs(date: string): number {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!parts) {
    throw new RangeError("Expected a local date in YYYY-MM-DD format.");
  }

  const value = civilUtc(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
  if (new Date(value).toISOString().slice(0, 10) !== date) {
    throw new RangeError("The local date is invalid.");
  }
  return value;
}

export function localToUtc(date: string, time: string, timezone: string): string {
  const parts = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!parts) {
    throw new RangeError("Expected a local time in HH:mm format.");
  }

  const wallTime = dateMs(date) + (Number(parts[1]) * 60 + Number(parts[2])) * MINUTE_MS;
  const { standard, rule } = zoneFor(timezone);
  const daylight = standard + 60;
  const summerTime = wallTime - daylight * MINUTE_MS;
  // Choose the earlier occurrence at the fall overlap. At the spring gap,
  // using the standard-time offset shifts the wall time forward by one hour.
  const utcMs = rule && offsetMinutes(summerTime, timezone) === daylight
    ? summerTime
    : wallTime - standard * MINUTE_MS;
  return new Date(utcMs).toISOString();
}

export function utcToLocal(isoUtc: string, timezone: string): { date: string; time: string; weekday: number } {
  const utcMs = Date.parse(isoUtc);
  const local = new Date(utcMs + offsetMinutes(utcMs, timezone) * MINUTE_MS);
  const [date, time] = local.toISOString().split("T");
  return { date, time: time.slice(0, 5), weekday: local.getUTCDay() };
}

export function localWeekday(date: string, timezone?: string): number {
  if (!date.includes("T")) return new Date(dateMs(date)).getUTCDay();
  if (!timezone) throw new RangeError("A time zone is required for UTC instants.");
  return utcToLocal(date, timezone).weekday;
}

export function addLocalDays(date: string, days: number): string {
  if (!Number.isInteger(days)) {
    throw new RangeError("Expected a whole number of local days.");
  }
  return new Date(dateMs(date) + days * DAY_MS).toISOString().split("T")[0];
}

export function startOfLocalDay(date: string, timezone: string): string {
  return localToUtc(date, "00:00", timezone);
}

export function localDateToUtcRange(date: string, timezone: string): { from: string; to: string } {
  return { from: startOfLocalDay(date, timezone), to: startOfLocalDay(addLocalDays(date, 1), timezone) };
}
