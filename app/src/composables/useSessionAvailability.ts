import type { SessionAvailability } from '@/lib/bookings';
import { parsePbError } from '@/lib/pb-errors';
import { pb } from '@/lib/pocketbase';

export function useSessionAvailability() {
  async function read<T>(path: string, query?: { from: string; to: string }) {
    try {
      return await pb.send<T>(path, { method: 'GET', query, requestKey: null });
    } catch (cause) {
      throw parsePbError(cause);
    }
  }

  return {
    get: (id: string) =>
      read<SessionAvailability>(
        `/api/admin/sessions/${encodeURIComponent(id)}/availability`,
      ),
    list: (range: { from: string; to: string }) =>
      read<SessionAvailability[]>('/api/admin/sessions/availability', range),
  };
}
