<script setup lang="ts">
import { t } from '@/i18n';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable, { type DataTablePageEvent } from 'primevue/datatable';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import { computed, ref, useId, watch } from 'vue';
import CatalogField from '@/components/catalog/CatalogField.vue';
import { fullName, type Client } from '@/lib/clients';
import { addLocalDays, formatDateTime, localToUtcIso } from '@/lib/datetime';
import { MESSAGE_LABELS } from '@/lib/messages';
import { parsePbError } from '@/lib/pb-errors';
import { pb } from '@/lib/pocketbase';

const states = computed(
  () =>
    ({
      sent: { label: t('Sent'), severity: 'success' },
      failed: { label: t('Failed'), severity: 'danger' },
    }) as const,
);
type MessageLog = {
  id: string;
  client: string;
  created: string;
  template_key: keyof typeof MESSAGE_LABELS.value;
  status: keyof typeof states.value;
  attempts: number;
  error: string;
  expand?: { client?: Client };
};
const id = useId();
const status = ref<string | null>(null);
const key = ref<string | null>(null);
const from = ref('');
const to = ref('');
const rows = ref<MessageLog[]>([]);
const loading = ref(false);
const error = ref('');
const total = ref(0);
const page = ref(1);
const pageSize = 20;
let revision = 0;

const statusOptions = computed(() =>
  Object.entries(states.value).map(([value, { label }]) => ({
    value,
    label,
  })),
);
const keyOptions = computed(() =>
  Object.entries(MESSAGE_LABELS.value).map(([value, label]) => ({
    value,
    label,
  })),
);

async function load() {
  const request = ++revision;
  loading.value = true;
  error.value = '';
  try {
    if (from.value && to.value && from.value > to.value) {
      error.value = t('The end date must be on or after the start date.');
      rows.value = [];
      total.value = 0;
      return;
    }
    const params: Record<string, string> = {};
    const clauses: string[] = [];
    if (status.value) {
      clauses.push('status = {:status}');
      params.status = status.value;
    }
    if (key.value) {
      clauses.push('template_key = {:key}');
      params.key = key.value;
    }
    if (from.value) {
      clauses.push('created >= {:from}');
      params.from = localToUtcIso(from.value, '00:00').replace('T', ' ');
    }
    if (to.value) {
      clauses.push('created < {:to}');
      params.to = localToUtcIso(addLocalDays(to.value, 1), '00:00').replace(
        'T',
        ' ',
      );
    }
    const result = await pb
      .collection('message_logs')
      .getList<MessageLog>(page.value, pageSize, {
        filter: pb.filter(clauses.join(' && '), params),
        sort: '-created,-id',
        expand: 'client',
        requestKey: null,
      });
    if (request !== revision) return;
    rows.value = result.items;
    total.value = result.totalItems;
    if (page.value > 1 && (page.value - 1) * pageSize >= total.value) {
      page.value = Math.max(1, Math.ceil(total.value / pageSize));
      await load();
    }
  } catch (cause) {
    if (request === revision)
      error.value =
        cause instanceof RangeError
          ? t('Check the date range.')
          : parsePbError(cause).message;
  } finally {
    if (request === revision) loading.value = false;
  }
}

watch(
  [status, key, from, to],
  () => {
    page.value = 1;
    void load();
  },
  { immediate: true },
);

function changePage(event: DataTablePageEvent) {
  page.value = event.page + 1;
  void load();
}
</script>

<template>
  <section :aria-label="t('Message history')" class="grid gap-4">
    <div
      class="grid gap-3 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto] xl:items-end"
    >
      <CatalogField :id="id + '-status'" :label="t('Status')">
        <Select
          v-model="status"
          :input-id="id + '-status'"
          :options="statusOptions"
          option-label="label"
          option-value="value"
          :placeholder="t('All')"
          show-clear
          fluid
        />
      </CatalogField>
      <CatalogField :id="id + '-type'" :label="t('Message type')">
        <Select
          v-model="key"
          :input-id="id + '-type'"
          :options="keyOptions"
          option-label="label"
          option-value="value"
          :placeholder="t('All')"
          show-clear
          fluid
        />
      </CatalogField>
      <CatalogField :id="id + '-from'" :label="t('From')">
        <InputText :id="id + '-from'" v-model="from" type="date" fluid />
      </CatalogField>
      <CatalogField :id="id + '-to'" :label="t('To')">
        <InputText :id="id + '-to'" v-model="to" type="date" fluid />
      </CatalogField>
      <Button
        :label="t('Refresh')"
        icon="pi pi-refresh"
        severity="secondary"
        outlined
        :loading="loading"
        @click="load"
      />
    </div>
    <p class="m-0 text-sm text-muted-color">
      {{ t('Dates use Miramar, Florida time.') }}
    </p>
    <Message v-if="error" severity="error" :closable="false">{{
      error
    }}</Message>
    <DataTable
      :value="rows"
      :loading="loading"
      :rows="pageSize"
      :total-records="total"
      :first="(page - 1) * pageSize"
      data-key="id"
      lazy
      paginator
      scrollable
      @page="changePage"
    >
      <template #empty>{{
        t('No sent messages match these filters.')
      }}</template>
      <Column field="created" :header="t('Date')">
        <template #body="{ data }">{{ formatDateTime(data.created) }}</template>
      </Column>
      <Column field="client" :header="t('Client')">
        <template #body="{ data }">{{
          data.expand?.client
            ? fullName(data.expand.client)
            : t('Client unavailable')
        }}</template>
      </Column>
      <Column field="template_key" :header="t('Message type')">
        <template #body="{ data }">{{
          MESSAGE_LABELS[data.template_key as MessageLog['template_key']]
        }}</template>
      </Column>
      <Column field="status" :header="t('Status')">
        <template #body="{ data }">
          <Tag
            :value="states[data.status as MessageLog['status']].label"
            :severity="states[data.status as MessageLog['status']].severity"
          />
        </template>
      </Column>
      <Column field="attempts" :header="t('Attempts')" />
      <Column field="error" :header="t('Error')">
        <template #body="{ data }">{{ data.error || '—' }}</template>
      </Column>
    </DataTable>
  </section>
</template>
