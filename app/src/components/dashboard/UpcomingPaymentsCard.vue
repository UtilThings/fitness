<script setup lang="ts">
import Card from 'primevue/card';
import type { UpcomingPayments } from '@/composables/useDashboard';
import { formatUsd } from '@/lib/money';

defineProps<{ payments: UpcomingPayments | null }>();
</script>

<template>
  <Card class="min-w-0">
    <template #title>Cobros por vencer</template>
    <template #content>
      <p v-if="payments">
        {{ payments.count }} por vencer · {{ formatUsd(payments.total_cents) }}
      </p>
      <p v-else class="text-surface-600 dark:text-surface-300">
        Disponible con Pagos (próximamente)
      </p>
    </template>
  </Card>
</template>
