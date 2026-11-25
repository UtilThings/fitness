import { computed } from 'vue';
import { t } from '@/i18n';
import type { Booking } from '@/lib/bookings';
import { localParts, localToUtcIso } from '@/lib/datetime';
import type { PbError } from '@/lib/pb-errors';
import type { ClassDetails, ClassSession } from '@/lib/schedule-week';

export interface SlotInput {
  coach: string;
  weekday: number;
  start_time: string;
  end_time: string;
}

export interface AvailabilitySlot extends SlotInput {
  id: string;
}

export interface AgendaSession extends ClassSession {
  expand?: ClassSession['expand'] & { bookings_via_session?: Booking[] };
}

export interface PrivateSessionInput {
  coach: string;
  service: string;
  starts_at: string;
  duration_min: number;
  client_ids: string[];
  capacity: number;
  notes: string;
  overrides?: Record<string, { override_note: string }>;
}

export type SpecialSessionInput = ClassDetails & {
  title: string;
  starts_at: string;
  notes: string;
};

export function slotError(
  draft: SlotInput,
  slots: AvailabilitySlot[],
  exclude?: string,
) {
  const time = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (
    !time.test(draft.start_time) ||
    !time.test(draft.end_time) ||
    draft.end_time <= draft.start_time
  ) {
    return t('Enter an end time after the start time.');
  }
  if (
    slots.some(
      (slot) =>
        slot.id !== exclude &&
        slot.weekday === draft.weekday &&
        slot.start_time < draft.end_time &&
        draft.start_time < slot.end_time,
    )
  ) {
    return t('This time slot overlaps another slot on the same day.');
  }
  return '';
}

export function slotsByDay(slots: AvailabilitySlot[]) {
  return Array.from({ length: 7 }, (_, weekday) =>
    slots
      .filter((slot) => slot.weekday === weekday)
      .sort((a, b) => a.start_time.localeCompare(b.start_time)),
  );
}

export function sessionStart(date: string, time: string) {
  try {
    return localToUtcIso(date, time);
  } catch {
    return '';
  }
}

export function fitsAvailability(
  slots: AvailabilitySlot[],
  start: string,
  duration: number,
) {
  const from = localParts(start);
  const to = localParts(
    new Date(Date.parse(start) + duration * 60_000).toISOString(),
  );
  // Let the server check the repeated fall hour, which can have the same local time at both ends.
  if (to.date === from.date && to.time <= from.time) return true;
  return (
    to.date === from.date &&
    slots.some(
      ({ weekday, start_time, end_time }) =>
        weekday === from.weekday &&
        start_time <= from.time &&
        to.time <= end_time,
    )
  );
}

const messages = computed<Record<string, string>>(() => ({
  coach_conflict: t('The coach already has a session at that time.'),
  outside_availability: t("Choose a time within the coach's availability."),
  block_conflict: t('This time overlaps a calendar block.'),
  invalid_capacity: t(
    'Capacity must be one or two and accommodate the selected clients.',
  ),
  partner_required: t(
    'Each client needs an active partner membership to book a session for two people.',
  ),
  duplicate_session: t(
    'A private session already exists for that coach, service, and time.',
  ),
  no_credits: t('The client has no available credits.'),
  weekly_limit: t('The client has reached their weekly booking limit.'),
  no_membership: t('The client has no membership for this service.'),
  membership_not_active: t(
    'The client has no active membership for the selected date.',
  ),
}));

export function agendaError(error: PbError) {
  return (error.code && messages.value[error.code]) || error.message;
}
