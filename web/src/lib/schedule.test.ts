import { expect, it } from 'vitest';
import { classTemplates } from './data';
import {
  classesForDay,
  formatRange,
  spotsLeft,
  weekDays,
  weekStart,
} from './schedule';

it.each([19, 15])('calculates local Sunday from November %i', (day) => {
  const now = new Date(2026, 10, day, 13);
  expect(weekStart(now, -1)).toEqual(new Date(2026, 10, 15));
  expect(weekStart(now, 0)).toEqual(new Date(2026, 10, 15));
  expect(weekStart(now, 1)).toEqual(new Date(2026, 10, 22));
  expect(now.getHours()).toBe(13);
});

it('lists seven local calendar days and formats the week range', () => {
  const days = weekDays(new Date(2026, 9, 25));
  expect(days).toHaveLength(7);
  expect(days[6]).toEqual(new Date(2026, 9, 31));
  expect(formatRange(days[0], days[6])).toBe('Oct 25 – Oct 31');
});

it('keeps availability stable and within capacity across 60 days', () => {
  for (let index = 0; index < 60; index += 1) {
    const date = new Date(2026, 9, 1 + index);
    for (const template of classTemplates) {
      const left = spotsLeft(date, template);
      expect(Number.isInteger(left)).toBe(true);
      expect(left).toBeGreaterThanOrEqual(0);
      expect(left).toBeLessThanOrEqual(template.capacity);
      expect(spotsLeft(date, template)).toBe(left);
    }
  }
});

it('returns only classes for the selected day and service', () => {
  expect(classesForDay(2, 'All')).toHaveLength(3);
  expect(classesForDay(2, 'Group Strength')).toHaveLength(3);
  expect(classesForDay(1, 'Group Strength')).toEqual([]);
  expect(classesForDay(1, 'Tropical Jump')).toHaveLength(1);
});
