import { useCatalogCollection } from '@/composables/useCatalogCollection';
import type { Plan } from '@/lib/catalog';

export function usePlans() {
  const plans = useCatalogCollection<Plan>(
    'plans',
    'service',
    (item, current) => item.service === current.service,
  );
  function load(service?: string) {
    plans.filters.value = service
      ? [{ expression: 'service = {:service}', params: { service } }]
      : [];
    return plans.load();
  }
  return { ...plans, load };
}
