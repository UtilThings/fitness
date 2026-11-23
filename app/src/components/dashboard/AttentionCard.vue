<script setup lang="ts">
import Card from 'primevue/card';
import type { DashboardAttention } from '@/composables/useDashboard';
import { formatDateTime } from '@/lib/datetime';

defineProps<{ items: DashboardAttention[] }>();

const reasons = { no_coach: 'Sin coach', no_bookings: 'Sin reservas' };
</script>

<template>
  <Card class="min-w-0">
    <template #title>Sesiones que requieren atención</template>
    <template #content>
      <p v-if="!items.length">No hay alertas para los próximos días.</p>
      <ul v-else class="grid gap-2">
        <li v-for="item in items" :key="`${item.session_id}-${item.reason}`">
          <RouterLink
            :to="{ path: '/classes', query: { session: item.session_id } }"
            class="text-primary hover:underline"
          >
            {{ formatDateTime(item.starts_at) }} · {{ reasons[item.reason] }}
          </RouterLink>
        </li>
      </ul>
    </template>
  </Card>
</template>
