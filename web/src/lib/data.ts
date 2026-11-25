import { formatMessage, tl, type Locale, type Text } from '../i18n';

export const classServiceSlugs = ['group-strength', 'tropical-jump'] as const;
export type ClassServiceSlug = (typeof classServiceSlugs)[number];

export interface Plan {
  name: Text;
  price: number;
  unit: Text;
  sessions: Text;
  freq: Text;
  note?: Text;
}

export interface ClassTemplate {
  day: number;
  time: string;
  service: Text;
  serviceSlug: ClassServiceSlug;
  coach: string;
  capacity: number;
}

function personalPlan(frequency: number, price: number, partner = false): Plan {
  return {
    name: {
      key: partner
        ? tl('Partner {frequency}x / week')
        : tl('{frequency}x / week'),
      params: { frequency },
    },
    price,
    unit: { key: tl('per 4 weeks') },
    sessions: {
      key: tl('{count} session | {count} sessions'),
      params: { count: frequency * 4 },
    },
    freq: {
      key: tl('{count} session per week | {count} sessions per week'),
      params: { count: frequency },
    },
  };
}

export const personalOneOnOne = [
  personalPlan(2, 800),
  personalPlan(3, 1080),
  personalPlan(4, 1280),
];
export const personalPartner = [
  personalPlan(2, 1127, true),
  personalPlan(3, 1447, true),
  personalPlan(4, 1597, true),
];

export const groupPlans: Plan[] = [
  {
    name: { key: tl('8-Class Pack') },
    price: 260,
    unit: { key: tl('per 4 weeks') },
    sessions: {
      key: tl('{count} class | {count} classes'),
      params: { count: 8 },
    },
    freq: {
      key: tl('{count} class per week | {count} classes per week'),
      params: { count: 2 },
    },
  },
  {
    name: { key: tl('16-Week Commitment') },
    price: 200,
    unit: { key: tl('per 4-week period') },
    sessions: {
      key: tl('{count} class / period | {count} classes / period'),
      params: { count: 8 },
    },
    freq: {
      key: tl('{count} billing period | {count} billing periods'),
      params: { count: 4 },
    },
    note: {
      key: tl(
        'Requires a {weeks}-week commitment ({count} billing period). | Requires a {weeks}-week commitment ({count} billing periods).',
      ),
      params: { weeks: 16, count: 4 },
    },
  },
];

export const jumpPlans: Plan[] = [
  {
    name: { key: tl('Single Class') },
    price: 15,
    unit: { key: tl('per class') },
    sessions: {
      key: tl('{count} class | {count} classes'),
      params: { count: 1 },
    },
    freq: { key: tl('Drop in anytime') },
  },
  {
    name: { key: tl('First Class') },
    price: 0,
    unit: { key: tl('first visit') },
    sessions: {
      key: tl('{count} class | {count} classes'),
      params: { count: 1 },
    },
    freq: { key: tl('New clients only') },
    note: { key: tl('One per client account.') },
  },
];

function jumpClass(day: number, time: string): ClassTemplate {
  return {
    day,
    time,
    service: { key: tl('Tropical Jump') },
    serviceSlug: 'tropical-jump',
    coach: 'Coach JQ',
    capacity: 12,
  };
}

function strengthClasses(day: number): ClassTemplate[] {
  return ['09:00', '17:30', '19:00'].map((time) => ({
    day,
    time,
    service: { key: tl('Group Strength') },
    serviceSlug: 'group-strength',
    coach: 'Coach JQ',
    capacity: 6,
  }));
}

export const classTemplates = [
  jumpClass(1, '19:30'),
  ...strengthClasses(2),
  jumpClass(3, '19:30'),
  ...strengthClasses(4),
  jumpClass(6, '09:00'),
];

export function availability(
  spotsLeft: number,
): 'full' | 'almost' | 'available' {
  if (spotsLeft <= 0) return 'full';
  if (spotsLeft <= 2) return 'almost';
  return 'available';
}

export const fallbackBusiness = {
  name: 'JQ Fitness',
  city: 'Miramar, FL',
  logo_url: '',
  currency: 'USD',
  timezone: 'America/New_York',
};

export function formatPrice(
  price: number,
  currency = fallbackBusiness.currency,
  language: Locale = 'en',
): string {
  if (price === 0) return formatMessage(tl('Free'), {}, language);
  return price.toLocaleString(regionalLocale(language), {
    style: 'currency',
    currency,
    minimumFractionDigits: Number.isInteger(price) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export function regionalLocale(language: Locale): string {
  return language === 'es' ? 'es-US' : 'en-US';
}

export function formatTime(time: string, language: Locale = 'en'): string {
  const [hours, minutes] = time.split(':');
  if (language === 'es') return `${hours}:${minutes}`;
  const hour = Number(hours);
  return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`;
}
