import { onUnmounted, ref, shallowRef } from 'vue';
import { paymentRequest } from '@/composables/usePayments';
import type { PbError } from '@/lib/pb-errors';
import { pb } from '@/lib/pocketbase';

type Customer = { id: string; name: string };
type Charge = {
  id: string;
  client: Customer;
  plan: string;
  amount_cents: number;
  due_on: string;
};
export interface PaymentsDue {
  today: string;
  overdue: (Charge & { days_overdue: number })[];
  upcoming: (Charge & { days_until: number })[];
  renewals: {
    membership: string;
    client: Customer;
    plan: string;
    period_end: string;
    state: 'ending_soon' | 'lapsed';
    has_pending_payment: boolean;
  }[];
  totals: {
    overdue_cents: number;
    upcoming_cents: number;
    overdue_count: number;
    upcoming_count: number;
    renewals_count: number;
  };
}

export function usePaymentsDue() {
  const data = shallowRef<PaymentsDue>();
  const error = shallowRef<PbError>();
  const loading = ref(false);
  let active: AbortController | undefined;

  async function refresh(days = 7, limit = 50) {
    active?.abort();
    const request = new AbortController();
    active = request;
    loading.value = true;
    error.value = undefined;
    try {
      const report = await paymentRequest(
        pb.send<PaymentsDue>('/api/admin/payments/due', {
          requestKey: null,
          signal: request.signal,
          query: { days, limit },
        }),
      );
      if (!request.signal.aborted) data.value = report;
    } catch (cause) {
      if (!request.signal.aborted) error.value = cause as PbError;
    } finally {
      if (active === request) loading.value = false;
    }
  }

  onUnmounted(() => active?.abort());
  return { data, error, loading, refresh };
}
