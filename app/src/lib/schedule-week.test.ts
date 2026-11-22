import { expect, it } from 'vitest';
import {
  filterSessions,
  groupByDay,
  weekDays,
  weekStartFor,
  weekdayLabel,
} from './schedule-week';

it('starts on Sunday and allows past and future weeks across DST', () => {
  expect(weekStartFor('2026-11-01')).toBe('2026-11-01');
  expect(weekStartFor('2026-11-07', -1)).toBe('2026-10-25');
  expect(weekStartFor('2026-11-02', 1)).toBe('2026-11-08');
  expect(weekDays('2026-11-01')).toEqual([
    '2026-11-01',
    '2026-11-02',
    '2026-11-03',
    '2026-11-04',
    '2026-11-05',
    '2026-11-06',
    '2026-11-07',
  ]);
  expect(weekdayLabel(0)).toBe('Domingo');
});

it('groups by local day and combines service and coach filters', () => {
  const slots = [
    { starts_at: '2026-11-03 00:30:00.000Z', service: 'jump', coach: 'jq' },
    { starts_at: '2026-11-03 14:00:00.000Z', service: 'strength', coach: 'jq' },
    {
      starts_at: '2026-11-03 22:30:00.000Z',
      service: 'strength',
      coach: 'other',
    },
  ];
  expect(groupByDay(slots).get('2026-11-02')).toEqual([slots[0]]);
  expect(groupByDay(slots).get('2026-11-03')).toHaveLength(2);
  expect(filterSessions(slots, { service: 'strength', coach: 'jq' })).toEqual([
    slots[1],
  ]);
  expect(filterSessions(slots, {})).toEqual(slots);
});
