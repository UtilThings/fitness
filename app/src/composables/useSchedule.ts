import { computed, ref, shallowRef } from 'vue';
import {
  localDateRangeToUtc,
  localDateToUtcRange,
  todayLocal,
  weekRangeUtc,
} from '@/lib/datetime';
import { parsePbError, type PbError } from '@/lib/pb-errors';
import { pb } from '@/lib/pocketbase';
import {
  weekStartFor,
  type ClassDetails,
  type ClassSession,
  type ClassTemplate,
  type ClassTemplateInput,
  type ScheduleBlock,
  type ScheduleBlockInput,
} from '@/lib/schedule-week';
import { useCollection } from './useCollection';

const expand = 'service,coach';

function within({ from, to }: { from: string; to: string }) {
  return pb.filter('starts_at >= {:from} && starts_at < {:to}', {
    from: from.replace('T', ' '),
    to: to.replace('T', ' '),
  });
}

export function useSchedule() {
  const sessionRecords = pb.collection('class_sessions');
  const templateRecords = useCollection<ClassTemplate>('class_templates', {
    fullList: true,
    expand,
    sort: 'weekday,start_time,id',
  });
  const blockRecords = useCollection<ScheduleBlock>('schedule_blocks', {
    fullList: true,
    sort: 'date_from,title,id',
  });
  const sessions = shallowRef<ClassSession[]>([]);
  const weekLoading = ref(false);
  const weekError = shallowRef<PbError | null>(null);
  let latestWeek = 0;

  async function loadWeek(offset = 0) {
    const version = ++latestWeek;
    weekLoading.value = true;
    weekError.value = null;
    try {
      const records = await sessionRecords.getFullList<ClassSession>({
        filter: within(weekRangeUtc(weekStartFor(todayLocal(), offset))),
        sort: 'starts_at,id',
        expand,
        requestKey: null,
      });
      if (version === latestWeek) sessions.value = records;
    } catch (cause) {
      if (version === latestWeek) {
        sessions.value = [];
        weekError.value = parsePbError(cause);
      }
    } finally {
      if (version === latestWeek) weekLoading.value = false;
    }
  }

  async function mutate<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (cause) {
      throw parsePbError(cause);
    }
  }

  function send<T>(path: string, body: object) {
    return mutate(() =>
      pb.send<T>(`/api/admin/${path}`, {
        method: 'POST',
        body,
        requestKey: null,
      }),
    );
  }

  return {
    sessions,
    templates: templateRecords.items,
    blocks: blockRecords.items,
    loading: computed(
      () =>
        weekLoading.value ||
        templateRecords.loading.value ||
        blockRecords.loading.value,
    ),
    error: computed(
      () =>
        weekError.value ??
        templateRecords.error.value ??
        blockRecords.error.value,
    ),
    loadWeek,
    getSession: (id: string) =>
      mutate(() =>
        sessionRecords.getOne<ClassSession>(id, { expand, requestKey: null }),
      ),
    listUpcoming: (date: string, now = new Date()) =>
      mutate(() =>
        sessionRecords.getFullList<ClassSession>({
          filter: [
            within(localDateToUtcRange(date)),
            pb.filter("status = 'scheduled' && starts_at > {:now}", {
              now: now.toISOString().replace('T', ' '),
            }),
          ].join(' && '),
          sort: 'starts_at,id',
          expand,
          requestKey: null,
        }),
      ),
    loadTemplates: templateRecords.load,
    loadBlocks: blockRecords.load,
    generate: (body: { weeks?: number; from?: string } = {}) =>
      send<{
        created: number;
        skipped_existing: number;
        skipped_blocked: number;
      }>('sessions/generate', body),
    cancelSession: (id: string, reason: string) =>
      send<ClassSession>(`sessions/${id}/cancel`, { reason }),
    moveSession: (
      id: string,
      {
        startsAt,
        coach,
        reason,
      }: { startsAt: string; coach?: string; reason: string },
    ) =>
      send<{ cancelled: ClassSession; created: ClassSession }>(
        `sessions/${id}/move`,
        {
          starts_at: startsAt,
          coach,
          reason,
        },
      ),
    assignCoach: (id: string, coach: string, applyToFuture: boolean) =>
      send<{ template: ClassTemplate; updated_sessions: number }>(
        `class-templates/${id}/assign-coach`,
        {
          coach,
          apply_to_future: applyToFuture,
        },
      ),
    createSpecialSession: (input: ClassDetails & { starts_at: string }) =>
      mutate(() =>
        sessionRecords.create<ClassSession>(
          { ...input, kind: 'special', status: 'scheduled' },
          { requestKey: null },
        ),
      ),
    updateSession: (
      id: string,
      changes: Pick<ClassSession, 'coach' | 'notes'>,
    ) =>
      mutate(() =>
        sessionRecords.update<ClassSession>(id, changes, { requestKey: null }),
      ),
    createTemplate: (input: ClassTemplateInput) =>
      templateRecords.create({ ...input }),
    updateTemplate: (id: string, input: Partial<ClassTemplateInput>) =>
      templateRecords.update(id, input),
    createBlock: (input: ScheduleBlockInput) =>
      blockRecords.create({ ...input }),
    updateBlock: (id: string, input: ScheduleBlockInput) =>
      blockRecords.update(id, { ...input }),
    deleteBlock: blockRecords.remove,
    countBlockSessions: (from: string, to: string) =>
      mutate(async () => {
        const result = await sessionRecords.getList<ClassSession>(1, 1, {
          filter: `${within(localDateRangeToUtc(from, to))} && status = 'scheduled'`,
          fields: 'id',
          requestKey: null,
        });
        return result.totalItems;
      }),
  };
}
