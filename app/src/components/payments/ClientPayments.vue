<script setup lang="ts">
import { t } from '@/i18n';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Message from 'primevue/message';
import { computed, onMounted, ref, shallowRef } from 'vue';
import { RouterLink } from 'vue-router';
import PaymentFormDialog from '@/components/payments/PaymentFormDialog.vue';
import PaymentStatusTag from '@/components/payments/PaymentStatusTag.vue';
import { useNotify } from '@/composables/useNotify';
import {
  isOverdue,
  usePayments,
  type Payment,
} from '@/composables/usePayments';
import type { Client } from '@/lib/clients';
import { formatCivilDate } from '@/lib/datetime';
import { formatCents } from '@/lib/money';
import type { PbError } from '@/lib/pb-errors';

const props = defineProps<{ client: Client }>();
const api = usePayments();
const notify = useNotify();
const rows = shallowRef<Payment[]>([]);
const loading = ref(false);
const error = ref('');
const open = ref(false);

const summary = computed(() => {
  let paid = 0;
  let pending = 0;
  let overdue = 0;
  for (const payment of rows.value) {
    if (payment.status === 'paid') paid += payment.amount_cents;
    if (payment.status === 'pending') {
      if (isOverdue(payment)) overdue += payment.amount_cents;
      else pending += payment.amount_cents;
    }
  }
  return { paid, pending, overdue };
});

async function load() {
  loading.value = true;
  error.value = '';
  try {
    rows.value = await api.listForClient(props.client.id);
  } catch (cause) {
    error.value = (cause as PbError).message;
  } finally {
    loading.value = false;
  }
}

function saved(payment: Payment) {
  notify.success(
    payment.receipt_number
      ? t('Payment recorded · {receipt}', { receipt: payment.receipt_number })
      : t('Pending charge recorded'),
  );
  void load();
}

onMounted(() => void load());
</script>

<template>
  <section class="grid gap-4" :aria-label="t('Payment history')">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <RouterLink
        :to="{ name: 'payments', query: { client: client.id } }"
        class="text-sm font-medium text-primary hover:underline"
      >
        {{ t('View in Payments') }}
      </RouterLink>
      <Button
        :label="t('Record payment')"
        icon="pi pi-plus"
        @click="open = true"
      />
    </div>

    <Message v-if="error" severity="error" :closable="false">
      {{ error }}
      <Button :label="t('Retry')" size="small" text @click="load" />
    </Message>
    <dl v-else-if="!loading" class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div
        class="rounded-lg border border-surface-200 p-3 dark:border-surface-700"
      >
        <dt class="text-sm">{{ t('Total paid') }}</dt>
        <dd class="font-semibold">{{ formatCents(summary.paid) }}</dd>
      </div>
      <div
        class="rounded-lg border border-surface-200 p-3 dark:border-surface-700"
      >
        <dt class="text-sm">{{ t('Pending') }}</dt>
        <dd class="font-semibold">{{ formatCents(summary.pending) }}</dd>
      </div>
      <div
        class="rounded-lg border border-surface-200 p-3 dark:border-surface-700"
      >
        <dt class="text-sm">{{ t('Overdue') }}</dt>
        <dd class="font-semibold">{{ formatCents(summary.overdue) }}</dd>
      </div>
    </dl>

    <DataTable
      v-if="!error"
      :value="rows"
      :loading="loading"
      data-key="id"
      paginator
      :rows="10"
      :always-show-paginator="false"
      table-style="min-width: 35rem"
    >
      <template #empty
        ><span v-if="!loading">{{
          t('This client has no payments yet.')
        }}</span></template
      >
      <Column :header="t('Description{\'\'}')">
        <template #body="{ data }">{{
          data.expand?.plan?.name ?? t('Manual charge')
        }}</template>
      </Column>
      <Column :header="t('Amount')">
        <template #body="{ data }">{{
          formatCents(data.amount_cents)
        }}</template>
      </Column>
      <Column :header="t('Status')">
        <template #body="{ data }"
          ><PaymentStatusTag :payment="data"
        /></template>
      </Column>
      <Column :header="t('Date')">
        <template #body="{ data }">
          {{
            data.paid_at || data.due_on
              ? formatCivilDate(data.paid_at || data.due_on)
              : '—'
          }}
        </template>
      </Column>
      <Column :header="t('Receipt')">
        <template #body="{ data }">
          <RouterLink
            v-if="data.receipt_number && data.status !== 'pending'"
            :to="{ name: 'receipt', params: { id: data.id } }"
            class="whitespace-nowrap text-primary hover:underline"
          >
            {{ data.receipt_number }}
          </RouterLink>
          <span v-else>—</span>
        </template>
      </Column>
    </DataTable>

    <PaymentFormDialog v-model="open" :client="client" @saved="saved" />
  </section>
</template>
