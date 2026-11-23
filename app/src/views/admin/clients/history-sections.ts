import type { Component } from 'vue';
import ClientBookings from '@/components/bookings/ClientBookings.vue';

type HistorySection = { key: string; label: string } & (
  | { available: false; component: null; feature: string }
  | { available: true; component: Component; feature?: string }
);

export const historySections: readonly HistorySection[] = [
  {
    key: 'bookings',
    label: 'Reservas',
    available: true,
    component: ClientBookings,
  },
  {
    key: 'payments',
    label: 'Pagos',
    available: false,
    component: null,
    feature: '014',
  },
];
