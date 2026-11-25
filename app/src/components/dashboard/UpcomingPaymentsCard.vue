<script setup lang="ts">
import { t } from '@/i18n';
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
    <template #title>{{ t('Upcoming charges') }}</template>
    <template #content>
      <Message v-if="error" severity="warn" :closable="false" class="mb-3">
        {{ error }}
        <Button
          :label="t('Retry charges')"
          size="small"
          text
          @click="$emit('retry')"
        />
      </Message>
      <p v-if="loading && !totals" role="status">{{ t('Loading charges…') }}</p>
      <template v-if="totals">
        <dl
          v-if="totals.overdue_count || totals.upcoming_count"
          class="grid gap-2"
        >
          <div class="flex flex-wrap justify-between gap-x-3">
            <dt>
              {{
                t(
                  '{count} overdue charge | {count} overdue charges',
                  { count: totals.overdue_count },
                  totals.overdue_count,
                )
              }}
            </dt>
            <dd class="font-medium">{{ formatCents(totals.overdue_cents) }}</dd>
          </div>
          <div class="flex flex-wrap justify-between gap-x-3">
            <dt>
              {{ t('{count} due in 7 days', { count: totals.upcoming_count }) }}
            </dt>
            <dd class="font-medium">
              {{ formatCents(totals.upcoming_cents) }}
            </dd>
          </div>
        </dl>
        <p v-else>{{ t('There are no overdue or upcoming charges.') }}</p>
        <RouterLink
          :to="{ path: '/payments', query: { overdue: '1' } }"
          class="mt-3 inline-block text-sm font-medium text-primary hover:underline"
        >
          {{ t('View overdue charges') }}
        </RouterLink>
      </template>
    </template>
  </Card>
</template>
