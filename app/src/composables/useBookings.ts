import type { AttendanceStatus, Booking } from '@/lib/bookings';
import { parsePbError } from '@/lib/pb-errors';
import { pb } from '@/lib/pocketbase';

export function useBookings() {
  const records = pb.collection<Booking>('bookings');
  const options = { requestKey: null };

  async function request<T>(operation: Promise<T>): Promise<T> {
    try {
      return await operation;
    } catch (cause) {
      throw parsePbError(cause);
    }
  }

  return {
    listBySession(session: string) {
      return request(
        records.getFullList({
          ...options,
          filter: pb.filter('session = {:session}', { session }),
          sort: 'waitlist_position,id',
          expand: 'client',
        }),
      );
    },
    listByClient(client: string) {
      return request(
        records.getFullList({
          ...options,
          filter: pb.filter('client = {:client}', { client }),
          sort: '-session.starts_at,id',
          expand: 'session,session.service',
        }),
      );
    },
    create({
      session,
      client,
      useFreeClass,
    }: {
      session: string;
      client: string;
      useFreeClass?: boolean;
    }) {
      return request(
        records.create(
          { session, client, use_free_class: useFreeClass === true },
          options,
        ),
      );
    },
    cancel(id: string, { overrideNote }: { overrideNote?: string } = {}) {
      return request(
        records.update(
          id,
          { status: 'cancelled', override_note: overrideNote },
          options,
        ),
      );
    },
    markAttendance(
      id: string,
      status: AttendanceStatus,
      overrideNote?: string,
    ) {
      return request(
        records.update(id, { status, override_note: overrideNote }, options),
      );
    },
    async hasFreeClassPlan(service: string) {
      const result = await request(
        pb.collection('plans').getList(1, 1, {
          ...options,
          fields: 'id',
          skipTotal: true,
          filter: pb.filter(
            'service = {:service} && active = true && is_first_class = true',
            { service },
          ),
        }),
      );
      return result.items.length > 0;
    },
  };
}
