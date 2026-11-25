import { computed } from 'vue';
import { t } from '@/i18n';
import type { Component } from 'vue';
import ClientBookings from '@/components/bookings/ClientBookings.vue';

type HistorySection = { key: string; label: string } & (
  | { available: false; component: null; feature: string }
  | { available: true; component: Component; feature?: string }
);

export const historySections = computed<readonly HistorySection[]>(() => [
  {
    key: 'bookings',
    label: t('Bookings'),
    available: true,
    component: ClientBookings,
  },
  {
    key: 'payments',
    label: t('Payments'),
    available: false,
    component: null,
    feature: '014',
  },
]);
