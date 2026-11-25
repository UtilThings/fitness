<script setup lang="ts">
import { t } from '@/i18n';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import Column from 'primevue/column';
import DataTable, { type DataTablePageEvent } from 'primevue/datatable';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';
import { computed, onMounted, ref, shallowRef, useId, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import PageHeader from '@/components/PageHeader.vue';
import CatalogField from '@/components/catalog/CatalogField.vue';
import ClientPicker from '@/components/clients/ClientPicker.vue';
import PaymentFormDialog from '@/components/payments/PaymentFormDialog.vue';
import PaymentStatusTag from '@/components/payments/PaymentStatusTag.vue';
import VoidPaymentDialog from '@/components/payments/VoidPaymentDialog.vue';
import { useClients } from '@/composables/useClients';
import { useNotify } from '@/composables/useNotify';
import {
  paymentMethods,
  paymentStatuses,
  usePayments,
  type Payment,
  type PaymentMethod,
  type PaymentStatus,
} from '@/composables/usePayments';
import { usePaymentsDue } from '@/composables/usePaymentsDue';
import { fullName, type Client } from '@/lib/clients';
import { formatCivilDate } from '@/lib/datetime';
import { formatCents } from '@/lib/money';
import type { PbError } from '@/lib/pb-errors';

const api = usePayments();
const clients = useClients();
const route = useRoute();
const { data: due, error: dueError, refresh: refreshDue } = usePaymentsDue();
const notify = useNotify();
const id = useId();
const status = ref<PaymentStatus>();
const method = ref<PaymentMethod>();
const client = shallowRef<Client | null>(null);
const routeClient = computed(() =>
  typeof route.query.client === 'string' ? route.query.client : undefined,
);
const clientId = ref(routeClient.value);
const from = ref('');
const through = ref('');
const overdue = ref(route.query.overdue === '1');
const page = ref(1);
const perPage = ref(20);
const rows = shallowRef<Payment[]>([]);
const total = ref(0);
const loading = ref(false);
const error = ref('');
let latest = 0;

const statuses = computed(() =>
  Object.entries(paymentStatuses.value).map(([value, label]) => ({
    value,
    label,
  })),
);
const methods = computed(() =>
  Object.entries(paymentMethods.value).map(([value, label]) => ({
    value,
    label,
  })),
);
const formOpen = ref(false);
const voidOpen = ref(false);
const selected = shallowRef<Payment>();

async function load() {
  const version = ++latest;
  error.value = '';
  if (from.value && through.value && from.value > through.value) {
    error.value = t('The start date must be on or before the end date.');
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    const result = await api.list({
      page: page.value,
      perPage: perPage.value,
      client: clientId.value,
      status: status.value,
      method: method.value,
      from: from.value,
      through: through.value,
      overdue: overdue.value,
    });
    if (latest !== version) return;
    if (page.value > Math.max(1, result.totalPages)) {
      page.value = Math.max(1, result.totalPages);
      await load();
      return;
    }
    rows.value = result.items;
    total.value = result.totalItems;
  } catch (cause) {
    if (latest === version) error.value = (cause as PbError).message;
  } finally {
    if (latest === version) loading.value = false;
  }
}

function changePage(event: DataTablePageEvent) {
  page.value = event.page + 1;
  perPage.value = event.rows;
  void load();
}

function openForm(payment?: Payment) {
  selected.value = payment;
  formOpen.value = true;
}

function openVoid(payment: Payment) {
  selected.value = payment;
  voidOpen.value = true;
}

function saved(payment: Payment) {
  const message =
    payment.status === 'void'
      ? t('Payment voided')
      : payment.status === 'pending'
        ? t('Pending charge recorded')
        : t('Payment recorded · {receipt}', {
            receipt: payment.receipt_number,
          });
  notify.success(message);
  void load();
  void refreshDue();
}

watch(
  [status, method, clientId, from, through, overdue],
  () => {
    page.value = 1;
    void load();
  },
  { immediate: true },
);

function selectClient(value: Client | null) {
  client.value = value;
  clientId.value = value?.id;
}

watch(
  routeClient,
  async (value, _, onCleanup) => {
    clientId.value = value;
    client.value = null;
    if (!value) return;
    let current = true;
    onCleanup(() => {
      current = false;
    });
    try {
      const record = await clients.get(value);
      if (current && clientId.value === value) client.value = record;
    } catch {
      // The filter remains active even when the client label is unavailable.
    }
  },
  { immediate: true },
);

watch(
  () => route.query.overdue,
  (value) => {
    overdue.value = value === '1';
  },
);

onMounted(() => void refreshDue());
</script>

<template>
  <section class="grid min-w-0 gap-5">
    <PageHeader :title="t('Payments')">
      <template #actions>
        <Button
          :label="t('Record payment')"
          icon="pi pi-plus"
          @click="openForm()"
        />
      </template>
    </PageHeader>

    <dl v-if="due" class="grid gap-3 sm:grid-cols-2">
      <div
        class="rounded-lg border border-surface-200 p-4 dark:border-surface-700"
      >
        <dt class="text-sm">
          {{ t('Overdue · {count}', { count: due.totals.overdue_count }) }}
        </dt>
        <dd class="text-xl font-semibold">
          {{ formatCents(due.totals.overdue_cents) }}
        </dd>
      </div>
      <div
        class="rounded-lg border border-surface-200 p-4 dark:border-surface-700"
      >
        <dt class="text-sm">
          {{
            t('Due in 7 days · {count}', { count: due.totals.upcoming_count })
          }}
        </dt>
        <dd class="text-xl font-semibold">
          {{ formatCents(due.totals.upcoming_cents) }}
        </dd>
      </div>
    </dl>
    <Message v-if="dueError" severity="warn" :closable="false">
      {{ t('Charge totals · {message}', { message: dueError.message }) }}
      <Button :label="t('Retry')" size="small" text @click="refreshDue()" />
    </Message>

    <div class="flex flex-wrap items-end gap-3">
      <CatalogField :id="id + '-status'" :label="t('Status')">
        <Select
          v-model="status"
          :input-id="id + '-status'"
          :aria-label="t('Status')"
          :options="statuses"
          option-label="label"
          option-value="value"
          show-clear
          :placeholder="t('All')"
          class="min-w-36"
        />
      </CatalogField>
      <CatalogField :id="id + '-method'" :label="t('Method')">
        <Select
          v-model="method"
          :input-id="id + '-method'"
          :aria-label="t('Method')"
          :options="methods"
          option-label="label"
          option-value="value"
          show-clear
          :placeholder="t('All')"
          class="min-w-36"
        />
      </CatalogField>
      <ClientPicker :model-value="client" @update:model-value="selectClient" />
      <Button
        v-if="clientId && !client"
        :label="t('Remove client filter')"
        severity="secondary"
        text
        size="small"
        @click="selectClient(null)"
      />
      <CatalogField :id="id + '-from'" :label="t('From')">
        <InputText :id="id + '-from'" v-model="from" type="date" />
      </CatalogField>
      <CatalogField :id="id + '-through'" :label="t('To')">
        <InputText :id="id + '-through'" v-model="through" type="date" />
      </CatalogField>
      <label
        :for="id + '-overdue'"
        class="flex items-center gap-2 self-end pb-2"
      >
        <Checkbox v-model="overdue" :input-id="id + '-overdue'" binary />
        {{ t('Overdue only') }}
      </label>
    </div>

    <Message v-if="error" severity="error" :closable="false">
      {{ error }}
      <Button :label="t('Retry')" size="small" text @click="load" />
    </Message>
    <DataTable
      v-else
      :value="rows"
      data-key="id"
      lazy
      paginator
      :loading="loading"
      :first="(page - 1) * perPage"
      :rows="perPage"
      :rows-per-page-options="[10, 20, 50]"
      :total-records="total"
      :always-show-paginator="false"
      table-style="min-width: 56rem"
      @page="changePage"
    >
      <template #empty
        ><span v-if="!loading">{{
          t('No payments to display.')
        }}</span></template
      >
      <Column :header="t('Client')">
        <template #body="{ data }">
          <RouterLink
            :to="{ name: 'client-detail', params: { id: data.client } }"
            class="font-semibold text-primary hover:underline"
          >
            {{
              data.expand?.client ? fullName(data.expand.client) : data.client
            }}
          </RouterLink>
        </template>
      </Column>
      <Column :header="t('Description{\'\'}')">
        <template #body="{ data }">{{
          data.expand?.plan?.name ?? t('Manual charge')
        }}</template>
      </Column>
      <Column :header="t('Amount')">
        <template #body="{ data }">{{
          formatCents(data.amount_cents, data.currency)
        }}</template>
      </Column>
      <Column :header="t('Method')">
        <template #body="{ data }">{{
          paymentMethods[data.method as PaymentMethod] ?? '—'
        }}</template>
      </Column>
      <Column :header="t('Status')">
        <template #body="{ data }"
          ><PaymentStatusTag :payment="data"
        /></template>
      </Column>
      <Column :header="t('Due date')">
        <template #body="{ data }">{{
          data.due_on ? formatCivilDate(data.due_on) : '—'
        }}</template>
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
      <Column :header="t('Actions')">
        <template #body="{ data }">
          <div class="flex flex-wrap gap-1">
            <Button
              v-if="data.status === 'pending'"
              :label="t('Mark as paid')"
              size="small"
              text
              @click="openForm(data)"
            />
            <Button
              v-if="data.status !== 'void'"
              :label="t('Void')"
              severity="danger"
              size="small"
              text
              @click="openVoid(data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <PaymentFormDialog v-model="formOpen" :payment="selected" @saved="saved" />
    <VoidPaymentDialog
      v-if="selected"
      v-model="voidOpen"
      :payment="selected"
      @saved="saved"
    />
  </section>
</template>
