export const SERVICE_KINDS = ["group", "personal", "online"] as const;
export const BILLING_UNITS = ["per_4_weeks", "per_class", "first_visit"] as const;

export interface ServiceInput {
  name: string;
  slug: string;
  kind: (typeof SERVICE_KINDS)[number];
  capacity: number;
  cancellation_hours: number;
  description?: string;
  active?: boolean;
  sort?: number;
}

export interface PlanInput {
  name: string;
  price_cents: number;
  billing_unit: (typeof BILLING_UNITS)[number];
  sessions: number;
  per_week: number;
  commitment_periods: number;
  is_first_class: boolean;
  partner?: boolean;
  note?: string;
  active?: boolean;
  sort?: number;
}

const validInteger = (value: number, min: number, max = Number.MAX_SAFE_INTEGER) =>
  Number.isSafeInteger(value) && value >= min && value <= max;

export function validateService(input: ServiceInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.name.trim() || input.name.length > 80) {
    errors.name = "Escribe un nombre de hasta 80 caracteres.";
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(input.slug)) {
    errors.slug = "Usa letras minúsculas, números y guiones entre palabras.";
  }
  if (!SERVICE_KINDS.includes(input.kind)) errors.kind = "Selecciona un tipo de servicio.";
  if (!validInteger(input.capacity, input.kind === "online" ? 0 : 1)) {
    errors.capacity = input.kind === "online" ? "El cupo debe ser un entero no negativo." : "El cupo debe ser un entero de al menos 1.";
  }
  if (!validInteger(input.cancellation_hours, 0, 168)) {
    errors.cancellation_hours = "Indica un número entero de horas entre 0 y 168.";
  }
  if ((input.description?.length ?? 0) > 500) errors.description = "Usa hasta 500 caracteres.";
  if (input.sort !== undefined && !validInteger(input.sort, 0)) errors.sort = "El orden debe ser un entero no negativo.";
  return errors;
}

export function validatePlan(input: PlanInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.name.trim() || input.name.length > 80) {
    errors.name = "Escribe un nombre de hasta 80 caracteres.";
  }
  if (input.is_first_class ? input.price_cents !== 0 : !validInteger(input.price_cents, 1)) {
    errors.price_cents = input.is_first_class
      ? "La primera clase debe ser gratis."
      : "El precio debe ser mayor que cero y expresarse en centavos enteros.";
  }
  if (input.is_first_class && input.billing_unit !== "first_visit") {
    errors.billing_unit = "La primera clase debe cobrarse por primera visita.";
  } else if (!BILLING_UNITS.includes(input.billing_unit)) {
    errors.billing_unit = "Selecciona una unidad de cobro.";
  }
  if (!validInteger(input.sessions, 0)) errors.sessions = "Indica un número entero de sesiones no negativo.";
  if (!validInteger(input.per_week, 0, 7)) errors.per_week = "Indica una frecuencia entera entre 0 y 7.";
  if (!validInteger(input.commitment_periods, 0)) {
    errors.commitment_periods = "Indica un número entero de periodos no negativo.";
  }
  if ((input.note?.length ?? 0) > 300) errors.note = "Usa hasta 300 caracteres.";
  if (input.sort !== undefined && !validInteger(input.sort, 0)) errors.sort = "El orden debe ser un entero no negativo.";
  return errors;
}

export function canActivatePlan(serviceActive: boolean): boolean {
  return serviceActive;
}

export function findFirstClassConflict(
  plans: readonly { id: string; is_first_class: boolean }[],
  candidateId: string,
): string | undefined {
  return plans.find((plan) => plan.is_first_class && plan.id !== candidateId)?.id;
}

export const CATALOG_DEPENDENTS = {
  service: [
    { collection: "plans", field: "service", singular: "plan asociado", plural: "planes asociados" },
    { collection: "class_templates", field: "service", singular: "plantilla asociada", plural: "plantillas asociadas" },
    { collection: "class_sessions", field: "service", singular: "sesión asociada", plural: "sesiones asociadas" },
  ],
  plan: [
    { collection: "memberships", field: "plan", singular: "membresía asociada", plural: "membresías asociadas" },
    { collection: "payments", field: "plan", singular: "pago asociado", plural: "pagos asociados" },
  ],
} as const;

export function dependentsBlockMessage(
  kind: keyof typeof CATALOG_DEPENDENTS,
  counts: Readonly<Record<string, number>>,
): string | null {
  const found = CATALOG_DEPENDENTS[kind].flatMap(({ collection, singular, plural }) => {
    const count = counts[collection] ?? 0;
    return count ? [`${count} ${count === 1 ? singular : plural}`] : [];
  });
  return found.length ? `Tiene ${found.join(", ")}. Desactívalo en su lugar.` : null;
}

interface SeedPlan extends PlanInput {
  sort: number;
  active: boolean;
  partner: boolean;
  note: string;
}

interface SeedService extends ServiceInput {
  sort: number;
  active: boolean;
  plans: readonly SeedPlan[];
}

function plan(name: string, price_cents: number, sort: number, options: Partial<SeedPlan>): SeedPlan {
  return {
    name, price_cents, sort, active: true, billing_unit: "per_4_weeks",
    sessions: 0, per_week: 0, commitment_periods: 0, is_first_class: false,
    partner: false, note: "", ...options,
  };
}

function personalPlans(prices: readonly number[], partner = false): SeedPlan[] {
  return prices.map((price, index) => {
    const per_week = index + 2;
    return plan(`${partner ? "Partner " : ""}${per_week}x / week`, price, index, {
      per_week, sessions: per_week * 4, partner,
    });
  });
}

export const CATALOG_SEED: readonly SeedService[] = [
  {
    name: "Personal Training 1 a 1", slug: "personal-1-a-1", kind: "personal", capacity: 1,
    cancellation_hours: 24, active: true, sort: 0, plans: personalPlans([80000, 108000, 128000]),
  },
  {
    name: "Personal Training Partner", slug: "personal-partner", kind: "personal", capacity: 2,
    cancellation_hours: 24, active: true, sort: 1, plans: personalPlans([112700, 144700, 159700], true),
  },
  {
    name: "Group Strength", slug: "group-strength", kind: "group", capacity: 6,
    cancellation_hours: 12, active: true, sort: 2,
    plans: [
      plan("8-Class Pack", 26000, 0, { sessions: 8, per_week: 2 }),
      plan("16-Week Commitment", 20000, 1, {
        sessions: 8, per_week: 2, commitment_periods: 4,
        note: "Requires a 16-week commitment (4 billing periods).",
      }),
    ],
  },
  {
    name: "Tropical Jump", slug: "tropical-jump", kind: "group", capacity: 12,
    cancellation_hours: 12, active: true, sort: 3,
    plans: [
      plan("Single Class", 1500, 0, { sessions: 1, billing_unit: "per_class" }),
      plan("First Class", 0, 1, {
        sessions: 1, billing_unit: "first_visit", is_first_class: true, note: "One per client account.",
      }),
    ],
  },
  {
    name: "Online Coaching", slug: "online-coaching", kind: "online", capacity: 0,
    cancellation_hours: 0, active: true, sort: 4, plans: [],
  },
];
