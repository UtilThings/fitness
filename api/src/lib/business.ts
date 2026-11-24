import { SUPPORTED_TIMEZONES } from "./tz";

export function isSupportedTimezone(value: string): boolean {
  return SUPPORTED_TIMEZONES.includes(value);
}

export function validateOrigins(value: unknown): string | undefined {
  if (value == null) return;
  if (!Array.isArray(value) || value.length > 10) return "Ingresa un máximo de 10 orígenes.";
  const seen = new Set<string>();
  for (const origin of value) {
    if (typeof origin !== "string" || origin.length > 300) return "Ingresa un origen HTTP o HTTPS válido.";
    const parts = /^(https?):\/\/((?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.)*[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?)(?::([1-9]\d{0,4}))?$/.exec(origin);
    if (!parts || Number(parts[3]) > 65535
      || parts[3] === (parts[1] === "https" ? "443" : "80")) {
      return "Ingresa un origen HTTP o HTTPS válido, sin ruta ni comodines.";
    }
    if (seen.has(origin)) return "Los orígenes no pueden repetirse.";
    seen.add(origin);
  }
}

export const BUSINESS_OWNER_FIELDS = ["name", "logo", "city", "phone", "email", "allowed_origins"];
