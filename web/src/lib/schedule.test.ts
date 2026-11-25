import { formatMessage } from '@/i18n';
import { resetLocaleAfterEach, useLocale } from '@/test/i18n';
import { expect, it } from 'vitest';
import {
  classesForDay,
  formatRange,
  weekDays,
  weekdayKeys,
  weekStart,
} from './schedule';

it.each([
  ['2026-11-19T13:00:00Z', '2026-11-15'],
  ['2026-11-22T04:59:00Z', '2026-11-15'],
  ['2026-11-22T05:00:00Z', '2026-11-22'],
  ['2026-03-08T04:59:00Z', '2026-03-01'],
  ['2026-03-08T05:00:00Z', '2026-03-08'],
  ['2026-11-01T03:59:00Z', '2026-10-25'],
  ['2026-11-01T04:00:00Z', '2026-11-01'],
])('calculates the Sunday in Miramar at %s', (instant, sunday) => {
  const now = new Date(instant);
  expect(weekStart(now, -1)).toEqual(new Date(`${sunday}T00:00:00Z`));
  expect(weekStart(now, 0)).toEqual(new Date(`${sunday}T00:00:00Z`));
  expect(weekStart(now, 1).getTime() - weekStart(now, 0).getTime()).toBe(
    7 * 86_400_000,
  );
  expect(now.toISOString()).toBe(new Date(instant).toISOString());
});

it('lists seven civil days and formats across years', () => {
  const days = weekDays(new Date('2026-12-27T00:00:00Z'));
  expect(days).toHaveLength(7);
  expect(days[6]).toEqual(new Date('2027-01-02T00:00:00Z'));
  expect(formatRange(days[0], days[6])).toBe('Dec 27 – Jan 2');
  expect(formatRange(days[0], days[6], 'es')).toBe('27 dic – 2 ene');
});

it('returns only fallback classes for the selected day and service', () => {
  expect(classesForDay(2, 'all')).toHaveLength(3);
  expect(classesForDay(2, 'group-strength')).toHaveLength(3);
  expect(classesForDay(1, 'group-strength')).toEqual([]);
  expect(classesForDay(1, 'tropical-jump')).toHaveLength(1);
});

resetLocaleAfterEach();

it('translates weekdays while calculating the week in the business timezone', async () => {
  await useLocale('es');
  const now = new Date('2026-08-23T04:30:00Z');
  expect(weekStart(now, 0, 'America/Bogota').toISOString()).toBe(
    '2026-08-16T00:00:00.000Z',
  );
  expect(weekStart(now, 0, 'America/New_York').toISOString()).toBe(
    '2026-08-23T00:00:00.000Z',
  );
  expect(weekdayKeys.map((key) => formatMessage(key))).toEqual([
    'domingo',
    'lunes',
    'martes',
    'miércoles',
    'jueves',
    'viernes',
    'sábado',
  ]);
});
