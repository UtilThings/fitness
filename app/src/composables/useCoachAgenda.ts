import { useCoachAvailability } from '@/composables/useCoachAvailability';
import type {
  AgendaSession,
  PrivateSessionInput,
  SpecialSessionInput,
} from '@/lib/agenda';
import type { Booking } from '@/lib/bookings';
import { localDateRangeToUtc } from '@/lib/datetime';
import { parsePbError } from '@/lib/pb-errors';
import { pb } from '@/lib/pocketbase';

export function useCoachAgenda() {
  const sessions = pb.collection('class_sessions');
  const { list: listSlots } = useCoachAvailability();
  const options = { requestKey: null };

  async function request<T>(operation: () => Promise<T>) {
    try {
      return await operation();
    } catch (cause) {
      throw parsePbError(cause);
    }
  }

  return {
    async list(coach: string, date: string, through = date) {
      const { from, to } = localDateRangeToUtc(date, through);
      const [records, slots] = await Promise.all([
        request(() =>
          sessions.getFullList<AgendaSession>({
            ...options,
            sort: 'starts_at,id',
            expand: 'service,coach,bookings_via_session.client',
            filter: pb.filter(
              'coach = {:coach} && starts_at >= {:from} && starts_at < {:to}',
              {
                coach,
                from: from.replace('T', ' '),
                to: to.replace('T', ' '),
              },
            ),
          }),
        ),
        listSlots(coach),
      ]);
      return { sessions: records, slots };
    },
    createPrivate: (body: PrivateSessionInput) =>
      request(() =>
        pb.send<{ session: AgendaSession; bookings: Booking[] }>(
          '/api/admin/sessions/private',
          {
            ...options,
            method: 'POST',
            body,
          },
        ),
      ),
    createSpecial: (body: SpecialSessionInput) =>
      request(() =>
        sessions.create<AgendaSession>(
          { ...body, kind: 'special', status: 'scheduled' },
          options,
        ),
      ),
  };
}
