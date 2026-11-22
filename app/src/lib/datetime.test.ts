import { afterEach, expect, it, vi } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatTime,
  localDateToUtcRange,
  localToUtcIso,
  todayLocal,
  utcToLocalParts,
  weekRangeUtc,
} from './datetime';

afterEach(() => vi.useRealTimers());

it.each([
  ['2026-03-08', '01:30', '2026-03-08T06:30:00.000Z'],
  ['2026-03-08', '03:30', '2026-03-08T07:30:00.000Z'],
  ['2026-11-01', '01:30', '2026-11-01T05:30:00.000Z'],
  ['2026-11-01', '02:30', '2026-11-01T07:30:00.000Z'],
  ['2026-11-01', '00:00', '2026-11-01T04:00:00.000Z'],
])('round-trips %s %s in New York', (date, time, iso) => {
  expect(localToUtcIso(date, time)).toBe(iso);
  expect(utcToLocalParts(iso)).toEqual({ date, time, weekday: 0 });
});

it('moves a nonexistent spring time forward and converts both fall occurrences', () => {
  expect(localToUtcIso('2026-03-08', '02:30')).toBe('2026-03-08T07:30:00.000Z');
  expect(utcToLocalParts('2026-11-01T06:30:00Z').time).toBe('01:30');
});

it('formats the New York date and time for an instant across UTC midnight', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-03-09T01:30:00Z'));
  expect(todayLocal()).toBe('2026-03-08');
  expect(formatDate('2026-03-09 01:30:00.000Z')).toMatch(/8.*mar.*2026/i);
  expect(formatTime('2026-03-09T01:30:00Z')).toMatch(/9:30\s*p\.\s*m\./);
  expect(formatDateTime('2026-03-08T07:30:00Z')).toMatch(
    /8.*mar.*2026.*3:30\s*a\.\s*m\./i,
  );
});

it('rejects invalid local dates and times', () => {
  expect(() => localToUtcIso('2026-02-30', '10:30')).toThrow(RangeError);
  expect(() => localToUtcIso('2026-03-08', '24:00')).toThrow(RangeError);
});

it('keeps the Monday evening time across DST and derives exact local day boundaries', () => {
  for (const iso of ['2026-10-26T23:30:00Z', '2026-11-03T00:30:00Z']) {
    expect(formatTime(iso, 'en-US')).toBe('7:30 PM');
    expect(utcToLocalParts(iso)).toMatchObject({ time: '19:30', weekday: 1 });
  }
  for (const [date, hours] of [
    ['2026-03-08', 23],
    ['2026-11-01', 25],
  ] as const) {
    const { from, to } = localDateToUtcRange(date);
    expect((Date.parse(to) - Date.parse(from)) / 3600000).toBe(hours);
  }
  expect(weekRangeUtc('2026-11-01')).toEqual({
    from: '2026-11-01T04:00:00.000Z',
    to: '2026-11-08T05:00:00.000Z',
  });
});
