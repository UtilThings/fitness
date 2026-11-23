<script setup lang="ts">
import Button from 'primevue/button';
import Card from 'primevue/card';
import Message from 'primevue/message';
import { RouterLink } from 'vue-router';
import type { PaymentsDue } from '@/composables/usePaymentsDue';
import { formatCents } from '@/lib/money';

defineProps<{
  totals?: PaymentsDue['totals'];
  loading: boolean;
  error?: string;
}>();
defineEmits<{ retry: [] }>();
</script>

<template>
  <Card class="min-w-0">
    <template #title>Cobros por vencer</template>
    <template #content>
      <Message v-if="error" severity="warn" :closable="false" class="mb-3">
        {{ error }}
        <Button
          label="Reintentar cobros"
          size="small"
          text
          @click="$emit('retry')"
        />
      </Message>
      <p v-if="loading && !totals" role="status">Cargando cobros…</p>
      <template v-if="totals">
        <dl
          v-if="totals.overdue_count || totals.upcoming_count"
          class="grid gap-2"
        >
          <div class="flex flex-wrap justify-between gap-x-3">
            <dt>
              {{ totals.overdue_count }}
              {{ totals.overdue_count === 1 ? 'vencido' : 'vencidos' }}
            </dt>
            <dd class="font-medium">{{ formatCents(totals.overdue_cents) }}</dd>
          </div>
          <div class="flex flex-wrap justify-between gap-x-3">
            <dt>{{ totals.upcoming_count }} por vencer en 7 días</dt>
            <dd class="font-medium">
              {{ formatCents(totals.upcoming_cents) }}
            </dd>
          </div>
        </dl>
        <p v-else>No hay cobros vencidos ni por vencer.</p>
        <RouterLink
          :to="{ path: '/payments', query: { overdue: '1' } }"
          class="mt-3 inline-block text-sm font-medium text-primary hover:underline"
        >
          Ver vencidos
        </RouterLink>
      </template>
    </template>
  </Card>
</template>
