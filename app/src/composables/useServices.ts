import { computed } from 'vue';
import { useCatalogCollection } from '@/composables/useCatalogCollection';
import { useCollection } from '@/composables/useCollection';
import { parsePbError } from '@/lib/pb-errors';
import { pb } from '@/lib/pocketbase';
import type { Service } from '@/lib/catalog';
import type { Admin } from '@/types/pb';

export function useServices() {
  const services = useCatalogCollection<Service>('services', 'default_coach');
  const coaches = useCollection<Admin>('admins', {
    fullList: true,
    sort: 'name',
    baseFilter: { expression: 'active = true && role != "reception"' },
  });
  const coachOptions = computed(() =>
    coaches.items.value.map(({ id, name, email }) => ({
      label: name || email,
      value: id,
    })),
  );
  async function countActivePlans(service: string) {
    try {
      const { totalItems } = await pb.collection('plans').getList(1, 1, {
        filter: pb.filter('service = {:service} && active = true', { service }),
        fields: 'id',
        requestKey: null,
      });
      return totalItems;
    } catch (cause) {
      throw parsePbError(cause);
    }
  }

  return {
    countActivePlans,
    ...services,
    coachOptions,
    coachesError: coaches.error,
    loadCoaches: coaches.load,
  };
}
