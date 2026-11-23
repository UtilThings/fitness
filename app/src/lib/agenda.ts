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
    return 'Indica una hora final posterior a la inicial.';
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
    return 'El tramo se solapa con otro del mismo día.';
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

const messages: Record<string, string> = {
  coach_conflict: 'El coach ya tiene una sesión en ese horario.',
  outside_availability:
    'Elige un horario dentro de un tramo de disponibilidad del coach.',
  block_conflict: 'El horario coincide con un bloqueo del calendario.',
  invalid_capacity:
    'El cupo debe ser de una o dos personas y alcanzar para los clientes seleccionados.',
  partner_required:
    'Cada cliente necesita una membresía partner activa para reservar una sesión con dos cupos.',
  duplicate_session:
    'Ya existe una sesión privada para ese coach, servicio y hora.',
  no_credits: 'El cliente no tiene créditos disponibles.',
  weekly_limit: 'El cliente alcanzó su límite semanal de reservas.',
  no_membership: 'El cliente no tiene una membresía para este servicio.',
  membership_not_active:
    'El cliente no tiene una membresía activa para la fecha elegida.',
};

export function agendaError(error: PbError) {
  return (error.code && messages[error.code]) || error.message;
}
