import { classTemplates, type ClassTemplate } from './data';

export type ServiceFilter = 'All' | ClassTemplate['service'];

export function weekStart(today: Date, offset: number): Date {
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay() + Math.max(0, offset) * 7);
  return start;
}

export function weekDays(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

export function spotsLeft(date: Date, template: ClassTemplate): number {
  const seed = date.getTime() / 864e5 + template.time.length + template.day;
  const taken = Math.floor(
    ((Math.sin(seed) + 1) / 2) * (template.capacity + 1),
  );
  return Math.max(0, template.capacity - taken);
}

export function classesForDay(
  dayIndex: number,
  filter: ServiceFilter,
): ClassTemplate[] {
  return classTemplates.filter(
    ({ day, service }) =>
      day === dayIndex && (filter === 'All' || filter === service),
  );
}

export function formatRange(start: Date, end: Date, locale = 'en-US'): string {
  const formatter = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
  });
  return `${formatter.format(start)} – ${formatter.format(end)}`;
}
