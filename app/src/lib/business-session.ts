import { computed, shallowRef } from 'vue';
import type { Business } from '@/types/pb';

export const currentBusiness = shallowRef<Business | null>(null);
export const businessCurrency = computed(
  () => currentBusiness.value?.currency ?? 'USD',
);
export const businessTimezone = computed(
  () => currentBusiness.value?.timezone ?? 'America/New_York',
);
