import type { Client } from '@/lib/clients';
import { formatDateTime } from '@/lib/datetime';
import type { ClassSession } from '@/lib/schedule-week';
import type { BaseRecord } from '@/types/pb';

export const BOOKING_STATUS = {
  booked: { label: 'Confirmada', severity: 'success' },
  waitlisted: { label: 'En espera', severity: 'warn' },
  cancelled: { label: 'Cancelada', severity: 'secondary' },
  late_cancelled: { label: 'Cancelada tarde', severity: 'warn' },
  attended: { label: 'Asistió', severity: 'success' },
  no_show: { label: 'No se presentó', severity: 'danger' },
} as const;

export type BookingStatus = keyof typeof BOOKING_STATUS;
export type AttendanceStatus = Extract<BookingStatus, 'attended' | 'no_show'>;
export type Availability = 'available' | 'almost' | 'full';

export interface Booking extends Omit<BaseRecord, 'created'> {
  session: string;
  client: string;
  status: BookingStatus;
  waitlist_position: number;
  cancelled_at: string;
  marked_by: string;
  source: 'admin';
  override_note: string;
  free_class: boolean;
  expand?: { client?: Client; session?: ClassSession };
}

export interface SessionAvailability {
  session: string;
  capacity: number;
  booked: number;
  waitlisted: number;
  spots_left: number;
  availability: Availability;
  cancellation_deadline: string;
}

export function formatDeadline(iso: string): string {
  return formatDateTime(iso);
}

export function canCancelBooking(
  booking: Booking,
  startsAt: string,
  now: number,
) {
  return (
    (booking.status === 'booked' || booking.status === 'waitlisted') &&
    now < Date.parse(startsAt.replace(' ', 'T'))
  );
}

export function canReserveSession(session: ClassSession, now: number) {
  return (
    session.status === 'scheduled' &&
    now < Date.parse(session.starts_at.replace(' ', 'T'))
  );
}
