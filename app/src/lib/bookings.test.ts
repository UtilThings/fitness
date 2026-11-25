import { expect, it } from 'vitest';
import {
  BOOKING_STATUS,
  canCancelBooking,
  formatDeadline,
  type Booking,
} from './bookings';
import { formatDateTime } from './datetime';

it('shows distinct labels for cancellation and attendance outcomes', () => {
  expect(BOOKING_STATUS.value.cancelled.label).not.toBe(
    BOOKING_STATUS.value.late_cancelled.label,
  );
  expect(BOOKING_STATUS.value.no_show.severity).toBe('danger');
});

it('uses business time for the UTC deadline and disables cancellation exactly at the start', () => {
  const time = '2026-11-22T20:00:00Z';
  const booked = { status: 'booked' } as Booking;
  expect(formatDeadline(time)).toBe(formatDateTime(time));
  expect(formatDeadline(time)).toContain('3:00');
  expect(canCancelBooking(booked, time, Date.parse(time) - 1)).toBe(true);
  expect(canCancelBooking(booked, time, Date.parse(time))).toBe(false);
  expect(
    canCancelBooking(
      { ...booked, status: 'no_show' },
      time,
      Date.parse(time) - 1,
    ),
  ).toBe(false);
});
