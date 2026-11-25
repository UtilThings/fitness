import { formatMessage, resolveText, setLocale, tl } from '@/i18n';
import { afterEach, expect, it } from 'vitest';
import {
  availability,
  classTemplates,
  formatPrice,
  formatTime,
  groupPlans,
  jumpPlans,
  personalOneOnOne,
  personalPartner,
} from './data';

it.each([
  [-1, 'full'],
  [0, 'full'],
  [1, 'almost'],
  [2, 'almost'],
  [3, 'available'],
])('categorizes %i spots', (spots, status) => {
  expect(availability(spots)).toBe(status);
});

it.each([
  [0, 'Free'],
  [15, '$15'],
  [15.5, '$15.50'],
  [1080, '$1,080'],
])('formats %i', (price, text) => {
  expect(formatPrice(price)).toBe(text);
});

it('provides the fallback plans and weekly class templates', () => {
  expect(personalOneOnOne.map(({ price }) => price)).toEqual([800, 1080, 1280]);
  expect(personalPartner.map(({ price }) => price)).toEqual([1127, 1447, 1597]);
  expect(groupPlans.map(({ price }) => price)).toEqual([260, 200]);
  expect(jumpPlans.map(({ price }) => price)).toEqual([15, 0]);
  expect(classTemplates).toHaveLength(9);
  for (const { capacity, day } of classTemplates) {
    expect(capacity).toBeGreaterThan(0);
    expect(day).toBeGreaterThanOrEqual(0);
    expect(day).toBeLessThanOrEqual(6);
  }
});

afterEach(async () => {
  await setLocale('en');
  localStorage.clear();
});

it('uses Spanish for free prices, plurals and clock time while keeping the business currency', async () => {
  await setLocale('es');
  expect(formatPrice(0, 'COP', 'es')).toBe('Gratis');
  expect(formatPrice(2345, 'COP', 'es')).toBe(
    new Intl.NumberFormat('es-US', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(2345),
  );
  expect(formatTime('09:00', 'en')).toBe('9:00 AM');
  expect(formatTime('09:00', 'es')).toBe('09:00');
  expect(formatTime('00:00', 'en')).toBe('12:00 AM');
  expect(formatTime('12:00', 'en')).toBe('12:00 PM');
  const key = tl('{count} class | {count} classes');
  expect(
    [0, 1, 8].map((count) =>
      resolveText({ key, params: { count } }, formatMessage),
    ),
  ).toEqual(['0 clases', '1 clase', '8 clases']);
});
