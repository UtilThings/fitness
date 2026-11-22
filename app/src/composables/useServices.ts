import { computed } from 'vue';
import { useCatalogCollection } from '@/composables/useCatalogCollection';
import { useCollection } from '@/composables/useCollection';
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
  return {
    ...services,
    coachOptions,
    coachesError: coaches.error,
    loadCoaches: coaches.load,
  };
}
