import { localWeekday, utcToLocal } from "./tz";

const common = ["client_first_name", "studio_name", "studio_phone"];
const classVariables = ["class_name", "class_date", "class_time", "coach_name"];

export const ALLOWED_VARIABLES = {
  booking_confirmed: [...common, ...classVariables],
  class_reminder: [...common, ...classVariables],
  class_cancelled: [...common, "class_name", "class_date", "class_time", "cancel_reason"],
  waitlist_promoted: [...common, ...classVariables],
  payment_due: [...common, "plan_name", "amount", "due_date"],
  membership_renewal: [...common, "plan_name", "period_end", "amount"],
  manual: ["client_first_name", "class_name", "class_date", "class_time", "studio_name"],
} as const;

export type MessageKey = keyof typeof ALLOWED_VARIABLES;
export type ServiceKey = Exclude<MessageKey, "manual">;
export type Locale = "es" | "en";
export type Template = { key: string; subject: string; body: string };
export type Variables = Record<string, string>;
export type TemplateProblem = {
  field: keyof Template;
  message: string;
  variable?: string;
};

const NEWLINE = /[\r\n\u0085\u2028\u2029]/;

export function isMessageKey(key: string): key is MessageKey {
  return Object.prototype.hasOwnProperty.call(ALLOWED_VARIABLES, key);
}

function substitute(text: string, value: (name: string) => string): string {
  const delimiter = /\{\{|\}\}/g;
  let offset = 0;
  let result = "";
  let match: RegExpExecArray | null;
  while ((match = delimiter.exec(text))) {
    const variable = /^\{\{[ \t]*([a-z][a-z0-9_]*)[ \t]*\}\}/i.exec(text.slice(match.index));
    if (!variable) throw new Error("Usa variables con la sintaxis {{nombre}}.");
    result += text.slice(offset, match.index) + value(variable[1]!);
    offset = match.index + variable[0].length;
    delimiter.lastIndex = offset;
  }
  return result + text.slice(offset);
}

export function extractVariables(text: string): string[] {
  const names = new Set<string>();
  substitute(text, (name) => {
    names.add(name);
    return "";
  });
  return [...names];
}

export function validateTemplate({ key, subject, body }: Template): TemplateProblem[] {
  const problems: TemplateProblem[] = [];
  if (!isMessageKey(key)) problems.push({ field: "key", message: "Clave de plantilla desconocida." });
  for (const [field, text, max] of [["subject", subject, 150], ["body", body, 5000]] as const) {
    if (!text.trim()) problems.push({ field, message: "Este campo es obligatorio." });
    if ([...text].length > max) problems.push({ field, message: `Máximo de ${max} caracteres.` });
    if (field === "subject" && NEWLINE.test(text)) {
      problems.push({ field, message: "El asunto debe ocupar una sola línea." });
    }
    try {
      for (const name of extractVariables(text)) {
        if (!isMessageKey(key) || !ALLOWED_VARIABLES[key].some((allowed) => allowed === name)) {
          problems.push({ field, message: `Variable no permitida: {{${name}}}.`, variable: name });
        }
      }
    } catch {
      problems.push({ field, message: "Usa variables con la sintaxis {{nombre}}." });
    }
  }
  return problems;
}

export function renderText(text: string, vars: Variables): string {
  return substitute(text, (name) => {
    if (!Object.prototype.hasOwnProperty.call(vars, name) || typeof vars[name] !== "string") {
      throw new Error(`Falta el valor de {{${name}}}.`);
    }
    return vars[name];
  });
}

const ENTITIES: Record<string, string> = {
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
};

export function renderHtml(body: string, vars: Variables): string {
  const escaped = renderText(body, vars).replace(/[&<>"']/g, (char) => ENTITIES[char]!);
  return escaped.replace(/\r\n?/g, "\n").split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p>`).join("");
}

export function renderTemplate(template: Template, vars: Variables) {
  const problems = validateTemplate(template);
  if (problems.length) throw new Error(problems[0]!.message);
  const subject = renderText(template.subject, vars);
  if (!subject.trim() || NEWLINE.test(subject)) throw new Error("El asunto debe ocupar una sola línea.");
  return { subject, body: renderText(template.body, vars), html: renderHtml(template.body, vars) };
}

const CALENDAR = {
  es: { days: ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"], months: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"] },
  en: { days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] },
};

export function formatDate(date: string, locale: Locale, timezone: string): string {
  const local = date.length === 10 ? date : utcToLocal(date.replace(" ", "T"), timezone).date;
  const [day, month] = [Number(local.slice(8, 10)), Number(local.slice(5, 7))];
  const names = CALENDAR[locale];
  const weekday = names.days[localWeekday(local)];
  return locale === "es" ? `${weekday} ${day} ${names.months[month - 1]}` : `${weekday}, ${names.months[month - 1]} ${day}`;
}

export function formatTime(instant: string, timezone: string): string {
  const [hour, minute] = utcToLocal(instant.replace(" ", "T"), timezone).time.split(":");
  const hours = Number(hour);
  return `${hours % 12 || 12}:${minute} ${hours < 12 ? "AM" : "PM"}`;
}

export function formatMoneyCents(cents: number, currency: string): string {
  const prefix = currency === "USD" ? "$" : currency + " ";
  return `${cents < 0 ? "-" : ""}${prefix}${(Math.abs(cents) / 100).toFixed(2)}`;
}
