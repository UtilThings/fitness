import type { AvailabilitySlot, SlotInput } from '@/lib/agenda';
import { parsePbError } from '@/lib/pb-errors';
import { pb } from '@/lib/pocketbase';

export function useCoachAvailability() {
  const records = pb.collection('coach_availability');
  const options = { requestKey: null };

  async function request<T>(operation: () => Promise<T>) {
    try {
      return await operation();
    } catch (cause) {
      throw parsePbError(cause);
    }
  }

  return {
    list: (coach: string) =>
      request(() =>
        records.getFullList<AvailabilitySlot>({
          ...options,
          sort: 'weekday,start_time,id',
          filter: pb.filter('coach = {:coach}', { coach }),
        }),
      ),
    create: (slot: SlotInput) =>
      request(() => records.create<AvailabilitySlot>(slot, options)),
    update: (id: string, slot: SlotInput) =>
      request(() => records.update<AvailabilitySlot>(id, slot, options)),
    remove: (id: string) => request(() => records.delete(id, options)),
  };
}
