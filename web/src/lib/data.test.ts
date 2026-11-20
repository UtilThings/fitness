import { expect, it } from 'vitest';
import {
  availability,
  classTemplates,
  formatPrice,
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
  [0, 'FREE'],
  [15, '$15'],
  [1080, '$1,080'],
])('formats %i', (price, text) => {
  expect(formatPrice(price)).toBe(text);
});

it('provides all plans and weekly class templates', () => {
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
