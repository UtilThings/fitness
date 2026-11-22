export function normalizeEmail(raw?: string | null): string {
  return (raw ?? "").trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return email === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function normalizePhone(raw?: string | null):
  { ok: true; value: string } | { ok: false; error: string } {
  const number = (raw ?? "").trim();
  if (!number) return { ok: true, value: "" };

  const compact = number.replace(/[\s().-]/g, "");
  if (/^\+[1-9]\d{7,14}$/.test(compact)) return { ok: true, value: compact };
  if (/^\d{10}$/.test(compact)) return { ok: true, value: "+1" + compact };
  if (/^1\d{10}$/.test(compact)) return { ok: true, value: "+" + compact };
  return { ok: false, error: "Ingresa un teléfono válido con código de país." };
}

type Shape = { [key: string]: Rule };
type Rule = Shape | ((value: unknown) => boolean);

const isText = (value: unknown) => typeof value === "string";
const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const oneOf = (...options: string[]) => (value: unknown) =>
  typeof value === "string" && options.includes(value);
const between = (min: number, max: number, integer = false) => (value: unknown) =>
  typeof value === "number" && value >= min && value <= max && (!integer || Number.isInteger(value));
const positive = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value > 0;

function isDate(value: unknown): boolean {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const assessmentV1: Shape = {
  version: (value) => value === 1,
  completed_on: isDate,
  assessed_by: (value) => typeof value === "string" && value.trim().length > 0,
  medical: {
    conditions: isText,
    injuries: isText,
    medications: isText,
    parq_cleared: (value) => typeof value === "boolean",
  },
  lifestyle: {
    activity_level: oneOf("sedentary", "light", "moderate", "high"),
    sleep_hours: between(0, 24),
    stress_level: between(1, 5, true),
    nutrition_notes: isText,
  },
  training: {
    experience: oneOf("none", "beginner", "intermediate", "advanced"),
    days_per_week: between(0, 7, true),
    preferred_times: isText,
    equipment_access: isText,
  },
  measurements: {
    weight_lb: positive,
    height_in: positive,
    waist_in: positive,
    body_fat_pct: (value) => positive(value) && between(0, 100)(value),
  },
  goals_detail: isText,
  notes: isText,
};

function checkShape(input: Record<string, unknown>, shape: Shape, errors: Record<string, string>, prefix = "") {
  for (const [key, value] of Object.entries(input)) {
    const path = prefix + key;
    if (!Object.prototype.hasOwnProperty.call(shape, key)) {
      errors[path] = "Campo desconocido.";
      continue;
    }
    const rule = shape[key]!;
    if (typeof rule === "function") {
      if (!rule(value)) errors[path] = "Valor inválido.";
    } else if (isObject(value)) {
      checkShape(value, rule, errors, path + ".");
    } else {
      errors[path] = "Debe ser un objeto.";
    }
  }
}

export function validateAssessment(input: unknown): {
  ok: boolean;
  errors: Record<string, string>;
  value: Record<string, unknown> | null;
} {
  const errors: Record<string, string> = Object.create(null);
  if (input == null || (isObject(input) && Object.keys(input).length === 0)) {
    return { ok: true, errors, value: null };
  }
  if (!isObject(input)) {
    errors.assessment = "La evaluación debe ser un objeto.";
    return { ok: false, errors, value: null };
  }
  checkShape(input, assessmentV1, errors);
  if (input.version !== 1) errors.version = "La versión debe ser 1.";
  const ok = Object.keys(errors).length === 0;
  return { ok, errors, value: ok ? input : null };
}

export function canChangeFreeClass({ role, from, to }: { role?: string; from: boolean; to: boolean }): boolean {
  return from === to || role === "owner";
}

export function normalizeSearchQuery(q: string): { tokens: string[]; digits: string } {
  return { tokens: q.toLowerCase().match(/\S+/g) ?? [], digits: q.replace(/\D/g, "") };
}
