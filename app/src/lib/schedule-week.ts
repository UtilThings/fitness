import { computed } from 'vue';
import { t } from '@/i18n';
import type { Service } from '@/lib/catalog';
import { addLocalDays, localParts, localToUtcIso } from '@/lib/datetime';
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

export type SessionKind = 'regular' | 'special' | 'private';

export interface ClassSession
  extends ScheduleRecord, ClassDetails, ClassRelations {
  template: string;
  starts_at: string;
  status: 'scheduled' | 'cancelled' | 'completed';
  kind: SessionKind;
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
  T extends Pick<ClassSession, 'service' | 'coach'> &
    Partial<Pick<ClassSession, 'kind'>>,
>(
  sessions: readonly T[],
  {
    service,
    coach,
    kind,
  }: { service?: string; coach?: string; kind?: SessionKind | '' },
): T[] {
  return sessions.filter(
    (session) =>
      (!service || session.service === service) &&
      (!coach || session.coach === coach) &&
      (!kind || (session.kind || 'regular') === kind),
  );
}

export function nextCalendarSlot(
  day: string,
  sessions: ClassSession[],
  now: number,
) {
  const occupied = sessions
    .filter(({ status }) => status !== 'cancelled')
    .map((session) => {
      const start = Date.parse(session.starts_at.replace(' ', 'T'));
      return { start, end: start + session.duration_min * 60_000 };
    });
  const hour = 3_600_000;
  const closing = Date.parse(localToUtcIso(addLocalDays(day, 1), '00:00'));
  for (
    let start = Date.parse(localToUtcIso(day, '09:00'));
    start + hour <= closing;
    start += hour / 2
  ) {
    if (
      start > now &&
      !occupied.some(
        ({ start: from, end }) => from < start + hour && end > start,
      )
    ) {
      return new Date(start).toISOString();
    }
  }
  return undefined;
}

const weekdays = computed(() => [
  t('Sunday'),
  t('Monday'),
  t('Tuesday'),
  t('Wednesday'),
  t('Thursday'),
  t('Friday'),
  t('Saturday'),
]);

export function weekdayLabel(weekday: number): string {
  return weekdays.value[weekday] ?? '';
}
