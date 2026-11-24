import { fetchCatalog, type PublicBusiness, type PublicService } from './api';
import * as staticData from './data';
import type { ClassTemplate, Plan } from './data';

export const SERVICE_SLUGS = {
  personalOneOnOne: 'personal-1-a-1',
  personalPartner: 'personal-partner',
  groupPlans: 'group-strength',
  jumpPlans: 'tropical-jump',
} as const;

export type PlanGroup = keyof typeof SERVICE_SLUGS;

export interface Catalog extends Record<PlanGroup, Plan[]> {
  source: 'api' | 'static';
  business: PublicBusiness;
  classTemplates: ClassTemplate[];
}

const fallback: Catalog = {
  source: 'static',
  business: staticData.fallbackBusiness,
  personalOneOnOne: staticData.personalOneOnOne,
  personalPartner: staticData.personalPartner,
  groupPlans: staticData.groupPlans,
  jumpPlans: staticData.jumpPlans,
  classTemplates: staticData.classTemplates,
};

function plural(count: number, singular: string, multiple: string) {
  return `${count} ${count === 1 ? singular : multiple}`;
}

export function toPlans(service: PublicService | undefined): Plan[] {
  const [singular, multiple] =
    service?.kind === 'personal'
      ? ['session', 'sessions']
      : ['class', 'classes'];
  return (service?.plans ?? []).map((plan) => {
    const { commitment_periods: commitment, price_cents: cents } = plan;
    const firstVisit =
      plan.is_first_class || plan.billing_unit === 'first_visit';
    const perClass = plan.billing_unit === 'per_class';
    const unit = firstVisit
      ? 'first visit'
      : perClass
        ? 'per class'
        : commitment
          ? 'per 4-week period'
          : 'per 4 weeks';
    const sessions = plan.sessions
      ? plural(plan.sessions, singular, multiple) +
        (commitment ? ' / period' : '')
      : '';
    const freq = firstVisit
      ? 'New clients only'
      : perClass
        ? 'Drop in anytime'
        : commitment
          ? plural(commitment, 'billing period', 'billing periods')
          : plan.per_week
            ? `${plural(plan.per_week, singular, multiple)} per week`
            : '';
    const note =
      plan.note ||
      (commitment
        ? `Requires a ${commitment * 4}-week commitment (${plural(commitment, 'billing period', 'billing periods')}).`
        : firstVisit
          ? 'One per client account.'
          : '');
    return {
      name: plan.name,
      price: cents / 100,
      unit,
      sessions,
      freq,
      ...(note ? { note } : {}),
    };
  });
}

export function formatLocalTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = Number(hours);
  return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`;
}

const templateNames = new Map<string, ClassTemplate['service']>([
  [SERVICE_SLUGS.groupPlans, 'Group Strength'],
  [SERVICE_SLUGS.jumpPlans, 'Tropical Jump'],
]);

export function toTemplates(service: PublicService): ClassTemplate[] {
  const name = templateNames.get(service.slug);
  if (!name) return [];
  return service.weekly_times.map((slot) => ({
    day: slot.weekday,
    time: formatLocalTime(slot.time),
    service: name,
    coach: slot.coach_name,
    capacity: slot.capacity,
  }));
}

function timeOrder(time: string) {
  const [clock, period] = time.split(' ');
  const [hour, minute] = clock.split(':').map(Number);
  return ((hour % 12) + (period === 'PM' ? 12 : 0)) * 60 + minute;
}

let pendingCatalog: Promise<Catalog> | undefined;

export function getCatalog(): Promise<Catalog> {
  // Islands mounting together share the request. The next visit still revalidates.
  pendingCatalog ??= fetchCatalog()
    .then(({ services, business }): Catalog => {
      const bySlug = new Map(
        services.map((service) => [service.slug, service]),
      );
      return {
        source: 'api',
        business: {
          ...business,
          city: business.city || staticData.fallbackBusiness.city,
        },
        personalOneOnOne: toPlans(bySlug.get(SERVICE_SLUGS.personalOneOnOne)),
        personalPartner: toPlans(bySlug.get(SERVICE_SLUGS.personalPartner)),
        groupPlans: toPlans(bySlug.get(SERVICE_SLUGS.groupPlans)),
        jumpPlans: toPlans(bySlug.get(SERVICE_SLUGS.jumpPlans)),
        classTemplates: services
          .flatMap(toTemplates)
          .sort(
            (a, b) => a.day - b.day || timeOrder(a.time) - timeOrder(b.time),
          ),
      };
    })
    .catch(() => fallback)
    .finally(() => {
      pendingCatalog = undefined;
    });
  return pendingCatalog;
}
