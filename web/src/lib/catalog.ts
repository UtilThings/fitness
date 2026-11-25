import { tl, type Message, type MessageKey } from '../i18n';
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

const quantities = {
  personal: {
    count: tl('{count} session | {count} sessions'),
    period: tl('{count} session / period | {count} sessions / period'),
    week: tl('{count} session per week | {count} sessions per week'),
  },
  group: {
    count: tl('{count} class | {count} classes'),
    period: tl('{count} class / period | {count} classes / period'),
    week: tl('{count} class per week | {count} classes per week'),
  },
};

function quantity(key: MessageKey, count: number): Message {
  return { key, params: { count } };
}

export function toPlans(service: PublicService | undefined): Plan[] {
  const labels =
    service?.kind === 'personal' ? quantities.personal : quantities.group;
  return (service?.plans ?? []).map((plan) => {
    const { commitment_periods: commitment, price_cents: cents } = plan;
    const firstVisit =
      plan.is_first_class || plan.billing_unit === 'first_visit';
    const perClass = plan.billing_unit === 'per_class';
    const unit = firstVisit
      ? tl('first visit')
      : perClass
        ? tl('per class')
        : commitment
          ? tl('per 4-week period')
          : tl('per 4 weeks');
    const sessions = plan.sessions
      ? quantity(commitment ? labels.period : labels.count, plan.sessions)
      : '';
    const freq = firstVisit
      ? { key: tl('New clients only') }
      : perClass
        ? { key: tl('Drop in anytime') }
        : commitment
          ? quantity(
              tl('{count} billing period | {count} billing periods'),
              commitment,
            )
          : plan.per_week
            ? quantity(labels.week, plan.per_week)
            : '';
    const note =
      plan.note ||
      (commitment
        ? {
            key: tl(
              'Requires a {weeks}-week commitment ({count} billing period). | Requires a {weeks}-week commitment ({count} billing periods).',
            ),
            params: { weeks: commitment * 4, count: commitment },
          }
        : firstVisit
          ? { key: tl('One per client account.') }
          : '');
    return {
      name: plan.name,
      price: cents / 100,
      unit: { key: unit },
      sessions,
      freq,
      ...(note ? { note } : {}),
    };
  });
}

export function toTemplates(service: PublicService): ClassTemplate[] {
  const serviceSlug = staticData.classServiceSlugs.find(
    (slug) => slug === service.slug,
  );
  if (!serviceSlug) return [];
  return service.weekly_times.map((slot) => ({
    day: slot.weekday,
    time: slot.time,
    service: service.name,
    serviceSlug,
    coach: slot.coach_name,
    capacity: slot.capacity,
  }));
}

function timeOrder(time: string) {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
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
