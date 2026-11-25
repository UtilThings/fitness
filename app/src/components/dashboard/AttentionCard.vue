<script setup lang="ts">
import { computed } from 'vue';
import { t } from '@/i18n';
import Card from 'primevue/card';
import type { DashboardAttention } from '@/composables/useDashboard';
import { formatDateTime } from '@/lib/datetime';

defineProps<{ items: DashboardAttention[] }>();

const reasons = computed(() => ({
  no_coach: t('No coach'),
  no_bookings: t('No bookings'),
}));
</script>

<template>
  <Card class="min-w-0">
    <template #title>{{ t('Sessions needing attention') }}</template>
    <template #content>
      <p v-if="!items.length">{{ t('No alerts for the next few days.') }}</p>
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
