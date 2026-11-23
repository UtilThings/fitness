import { onMounted, onUnmounted, ref, shallowRef } from 'vue';
import type { Availability } from '@/lib/bookings';
import { parsePbError, type PbError } from '@/lib/pb-errors';
import { pb } from '@/lib/pocketbase';

export interface DashboardSession {
  id: string;
  service: { id: string; name: string; kind: string };
  starts_at: string;
  duration_min: number;
  coach: { id: string; name: string } | null;
  capacity: number;
  booked: number;
  waitlisted: number;
  spots_left: number;
  availability: Availability;
  status: 'scheduled' | 'completed';
}

export interface DashboardAttention {
  session_id: string;
  reason: 'no_coach' | 'no_bookings';
  starts_at: string;
}

export interface UpcomingPayments {
  count: number;
  total_cents: number;
  items: unknown[];
}

export interface DashboardSummary {
  generated_at: string;
  timezone: string;
  today: { date: string; start_utc: string; end_utc: string };
  counts: {
    active_clients: number;
    sessions_today: number;
    bookings_today: number;
    waitlisted_today: number;
    sessions_without_coach: number;
    sessions_without_bookings: number;
  };
  sessions_today: DashboardSession[];
  attention: DashboardAttention[];
  upcoming_payments: UpcomingPayments | null;
}

export function useDashboard() {
  const data = shallowRef<DashboardSummary>();
  const loading = ref(false);
  const error = shallowRef<PbError>();
  const controller = new AbortController();
  let timer: ReturnType<typeof setInterval>;

  async function refresh() {
    if (loading.value || controller.signal.aborted) return;
    loading.value = true;
    error.value = undefined;
    try {
      data.value = await pb.send<DashboardSummary>('/api/admin/dashboard', {
        requestKey: null,
        signal: controller.signal,
      });
    } catch (cause) {
      if (!controller.signal.aborted) error.value = parsePbError(cause);
    } finally {
      loading.value = false;
    }
  }

  onMounted(() => {
    void refresh();
    timer = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 60_000);
  });

  onUnmounted(() => {
    clearInterval(timer);
    controller.abort();
  });

  return { data, loading, error, refresh };
}
