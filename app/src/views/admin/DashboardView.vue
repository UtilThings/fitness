<script setup lang="ts">
import Button from 'primevue/button';
import { computed, watch } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import AttentionCard from '@/components/dashboard/AttentionCard.vue';
import DashboardFeedback from '@/components/dashboard/DashboardFeedback.vue';
import StatCard from '@/components/dashboard/StatCard.vue';
import TodayClassesCard from '@/components/dashboard/TodayClassesCard.vue';
import UpcomingPaymentsCard from '@/components/dashboard/UpcomingPaymentsCard.vue';
import { useAuth } from '@/composables/useAuth';
import { usePaymentsDue } from '@/composables/usePaymentsDue';
import { useDashboard } from '@/composables/useDashboard';
import { formatTime } from '@/lib/datetime';

const { data, loading, error, refresh } = useDashboard();
const { can } = useAuth();
const canManagePayments = computed(() => can('payments.manage'));
const due = usePaymentsDue();

watch(
  [canManagePayments, () => data.value?.generated_at],
  ([allowed, generated]) => {
    if (allowed && generated) void due.refresh(7, 1);
  },
);
</script>

<template>
  <div class="grid min-w-0 gap-4">
    <PageHeader title="Panel de administración">
      <template #actions>
        <p
          v-if="data"
          class="text-sm text-surface-600 dark:text-surface-300"
          aria-live="polite"
        >
          Actualizado {{ formatTime(data.generated_at) }}
        </p>
        <Button
          label="Actualizar"
          icon="pi pi-refresh"
          :loading="loading"
          outlined
          @click="refresh"
        />
      </template>
    </PageHeader>

    <DashboardFeedback
      :error="error?.message"
      :loading="loading && !data"
      @retry="refresh"
    />
    <template v-if="data">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Clientes activos"
          icon="pi pi-users"
          :value="data.counts.active_clients"
          :to="{ path: '/clients', query: { status: 'active' } }"
        />
        <StatCard
          title="Clases hoy"
          icon="pi pi-calendar"
          :value="data.counts.sessions_today"
          to="/classes"
        />
        <StatCard
          title="Reservas hoy"
          icon="pi pi-bookmark"
          :value="data.counts.bookings_today"
        />
        <StatCard
          title="En espera"
          icon="pi pi-clock"
          :value="data.counts.waitlisted_today"
        />
      </div>
      <div class="grid min-w-0 gap-4 lg:grid-cols-3">
        <TodayClassesCard
          class="lg:col-span-2"
          :sessions="data.sessions_today"
        />
        <div class="grid min-w-0 content-start gap-4">
          <AttentionCard :items="data.attention" />
          <UpcomingPaymentsCard
            v-if="canManagePayments"
            :totals="due.data.value?.totals"
            :loading="due.loading.value"
            :error="due.error.value?.message"
            @retry="due.refresh(7, 1)"
          />
        </div>
      </div>
    </template>
  </div>
</template>
