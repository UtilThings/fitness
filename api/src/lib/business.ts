import { SUPPORTED_TIMEZONES } from "./tz";

export function isSupportedTimezone(value: string): boolean {
  return SUPPORTED_TIMEZONES.includes(value);
}

export function validateOrigins(value: unknown): string | undefined {
  if (value == null) return;
  if (!Array.isArray(value) || value.length > 10) return "Enter at most 10 origins.";
  const seen = new Set<string>();
  for (const origin of value) {
    if (typeof origin !== "string" || origin.length > 300) return "Enter a valid HTTP or HTTPS origin.";
    const parts = /^(https?):\/\/((?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.)*[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?)(?::([1-9]\d{0,4}))?$/.exec(origin);
    if (!parts || Number(parts[3]) > 65535
      || parts[3] === (parts[1] === "https" ? "443" : "80")) {
      return "Enter a valid HTTP or HTTPS origin without a path or wildcards.";
    }
    if (seen.has(origin)) return "Origins must be unique.";
    seen.add(origin);
  }
}

export const BUSINESS_OWNER_FIELDS = ["name", "logo", "city", "phone", "email", "allowed_origins"];
