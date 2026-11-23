import type { Service } from '@/lib/catalog';
import { addLocalDays, localParts } from '@/lib/datetime';
import type { Admin, BaseRecord } from '@/types/pb';

type ScheduleRecord = Pick<
  BaseRecord,
  'id' | 'collectionId' | 'collectionName'
>;

export interface ClassDetails {
  service: string;
  duration_min: number;
  coach: string;
  capacity: number;
}

interface ClassRelations {
  expand?: { service?: Service; coach?: Admin };
}

export interface ClassTemplateInput extends ClassDetails {
  weekday: number;
  start_time: string;
  active: boolean;
}

export interface ClassTemplate
  extends ScheduleRecord, ClassTemplateInput, ClassRelations {}

export interface ClassSession
  extends ScheduleRecord, ClassDetails, ClassRelations {
  template: string;
  starts_at: string;
  status: 'scheduled' | 'cancelled' | 'completed';
  kind: 'regular' | 'special' | 'private';
  title?: string;
  cancel_reason: string;
  notes: string;
}

export interface ScheduleBlockInput {
  title: string;
  date_from: string;
  date_to: string;
  reason: string;
}

export interface ScheduleBlock extends ScheduleRecord, ScheduleBlockInput {}

export function weekStartFor(todayLocalDate: string, offset = 0): string {
  const weekday = new Date(`${todayLocalDate}T00:00:00Z`).getUTCDay();
  return addLocalDays(todayLocalDate, offset * 7 - weekday);
}

export function weekDays(start: string): string[] {
  return Array.from({ length: 7 }, (_, day) => addLocalDays(start, day));
}

export function groupByDay<T extends Pick<ClassSession, 'starts_at'>>(
  sessions: readonly T[],
) {
  const groups = new Map<string, T[]>();
  for (const session of sessions) {
    const date = localParts(session.starts_at).date;
    const group = groups.get(date);
    if (group) group.push(session);
    else groups.set(date, [session]);
  }
  return groups;
}

export function filterSessions<
  T extends Pick<ClassSession, 'service' | 'coach'>,
>(
  sessions: readonly T[],
  { service, coach }: { service?: string; coach?: string },
): T[] {
  return sessions.filter(
    (session) =>
      (!service || session.service === service) &&
      (!coach || session.coach === coach),
  );
}

const weekdays = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

export function weekdayLabel(weekday: number): string {
  return weekdays[weekday] ?? '';
}
