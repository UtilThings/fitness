import { availabilityOf } from "./booking-rules";
import type { PlanInput, ServiceInput } from "./catalog";
import { addLocalDays, localWeekday, utcToLocal } from "./tz";

export const availabilityStatus = availabilityOf;
export const PUBLIC_SCHEDULE_MAX_WEEKS = 8;

export class PublicQueryError extends Error {}

export function normalizeWeek(input: string | undefined, today: string, maxWeeks = PUBLIC_SCHEDULE_MAX_WEEKS): string {
  const current = addLocalDays(today, -localWeekday(today));
  if (input === undefined) return current;
  try {
    const requested = addLocalDays(input, -localWeekday(input));
    if (requested > addLocalDays(current, maxWeeks * 7)) throw new RangeError();
    return requested < current ? current : requested;
  } catch {
    throw new PublicQueryError("Enter a valid week date within the allowed range.");
  }
}

export type PublicBusiness = { name: string; city: string; logo_url: string; currency: string; timezone: string };

type Ordered = { active: boolean; sort: number };
export type PublicServiceInput = Ordered & Pick<ServiceInput, "slug" | "kind" | "name"> & { id: string };
export type PublicPlanInput = Ordered & Omit<PlanInput, "active" | "sort"> & { service: string };
export type PublicTemplateInput = {
  service: string; active: boolean; weekday: number; start_time: string; coach: string; capacity: number;
};
export type PublicSessionInput = {
  id: string; service: string; coach: string; starts_at: string; capacity: number; kind: string; status: string;
};

export function buildCatalog(
  services: readonly PublicServiceInput[],
  plans: readonly PublicPlanInput[],
  templates: readonly PublicTemplateInput[],
  coaches: ReadonlyMap<string, string>,
  business: PublicBusiness,
) {
  const activePlans = plans.filter((plan) => plan.active).sort((a, b) => a.sort - b.sort);
  const activeTemplates = templates.filter((template) => template.active)
    .sort((a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time));
  return {
    version: 2,
    business,
    currency: business.currency,
    services: services.filter((service) => service.active).sort((a, b) => a.sort - b.sort).map((service) => ({
      slug: service.slug,
      kind: service.kind,
      name: service.name,
      plans: activePlans.filter((plan) => plan.service === service.id).map((plan) => ({
        name: plan.name,
        price_cents: plan.price_cents,
        billing_unit: plan.billing_unit,
        sessions: plan.sessions,
        per_week: plan.per_week,
        commitment_periods: plan.commitment_periods,
        is_first_class: plan.is_first_class,
        partner: plan.partner ?? false,
        note: plan.note ?? "",
      })),
      weekly_times: activeTemplates.filter((template) => template.service === service.id).map((template) => ({
        weekday: template.weekday,
        time: template.start_time,
        coach_name: coaches.get(template.coach) ?? "",
        capacity: template.capacity,
      })),
    })),
  };
}

export function buildSchedule(
  weekStart: string,
  sessions: readonly PublicSessionInput[],
  bookingCounts: ReadonlyMap<string, number>,
  services: readonly PublicServiceInput[],
  coaches: ReadonlyMap<string, string>,
  business: PublicBusiness,
) {
  const weekEnd = addLocalDays(weekStart, 6);
  const activeServices = new Map(services.filter((service) => service.active).map((service) => [service.id, service]));
  return {
    version: 2,
    business,
    timezone: business.timezone,
    week_start: weekStart,
    week_end: weekEnd,
    sessions: [...sessions].sort((a, b) => a.starts_at.localeCompare(b.starts_at)).flatMap((session) => {
      const service = activeServices.get(session.service);
      if (!service || session.status !== "scheduled" || !["regular", "special"].includes(session.kind)) return [];
      const local = utcToLocal(session.starts_at.replace(" ", "T"), business.timezone);
      if (local.date < weekStart || local.date > weekEnd) return [];
      const spots_left = Math.max(0, session.capacity - (bookingCounts.get(session.id) ?? 0));
      return [{
        local_date: local.date,
        local_time: local.time,
        service: { slug: service.slug, name: service.name },
        coach_name: coaches.get(session.coach) ?? "",
        capacity: session.capacity,
        spots_left,
        status: availabilityStatus(spots_left),
      }];
    }),
  };
}
