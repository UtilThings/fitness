import { tl, type Locale } from '../i18n';
import {
  classTemplates,
  fallbackBusiness,
  regionalLocale,
  type ClassServiceSlug,
  type ClassTemplate,
} from './data';

export type ServiceFilter = 'all' | ClassServiceSlug;

export const weekdayKeys = [
  tl('Sunday'),
  tl('Monday'),
  tl('Tuesday'),
  tl('Wednesday'),
  tl('Thursday'),
  tl('Friday'),
  tl('Saturday'),
] as const;

export const MAX_SCHEDULE_WEEKS = 8;

// Keep civil dates at UTC midnight so formatting and day arithmetic use the same date in any browser.
export function weekStart(
  today: Date,
  offset: number,
  timeZone = fallbackBusiness.timezone,
): Date {
  const businessCalendar = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = Object.fromEntries(
    businessCalendar
      .formatToParts(today)
      .map(({ type, value }) => [type, value]),
  );
  const start = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00Z`);
  start.setUTCDate(
    start.getUTCDate() - start.getUTCDay() + Math.max(0, offset) * 7,
  );
  return start;
}

export function weekDays(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + index);
    return day;
  });
}

export function classesForDay(
  dayIndex: number,
  filter: ServiceFilter,
): ClassTemplate[] {
  return classTemplates.filter(
    ({ day, serviceSlug }) =>
      day === dayIndex && (filter === 'all' || filter === serviceSlug),
  );
}

export function formatRange(
  start: Date,
  end: Date,
  language: Locale = 'en',
): string {
  const formatter = new Intl.DateTimeFormat(regionalLocale(language), {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
  });
  return `${formatter.format(start)} – ${formatter.format(end)}`;
}
