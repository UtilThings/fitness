<script setup lang="ts">
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable, { type DataTablePageEvent } from 'primevue/datatable';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import { ref, useId, watch } from 'vue';
import CatalogField from '@/components/catalog/CatalogField.vue';
import { fullName, type Client } from '@/lib/clients';
import { addLocalDays, formatDateTime, localToUtcIso } from '@/lib/datetime';
import { MESSAGE_LABELS } from '@/lib/messages';
import { parsePbError } from '@/lib/pb-errors';
import { pb } from '@/lib/pocketbase';

const states = {
  sent: { label: 'Enviado', severity: 'success' },
  failed: { label: 'Fallido', severity: 'danger' },
} as const;
type MessageLog = {
  id: string;
  client: string;
  created: string;
  template_key: keyof typeof MESSAGE_LABELS;
  status: keyof typeof states;
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

const statusOptions = Object.entries(states).map(([value, { label }]) => ({
  value,
  label,
}));
const keyOptions = Object.entries(MESSAGE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

async function load() {
  const request = ++revision;
  loading.value = true;
  error.value = '';
  try {
    if (from.value && to.value && from.value > to.value) {
      error.value = 'La fecha final debe ser igual o posterior a la inicial.';
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
          ? 'Revisa el rango de fechas.'
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
  <section aria-label="Historial de envíos" class="grid gap-4">
    <div
      class="grid gap-3 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto] xl:items-end"
    >
      <CatalogField :id="id + '-status'" label="Estado">
        <Select
          v-model="status"
          :input-id="id + '-status'"
          :options="statusOptions"
          option-label="label"
          option-value="value"
          placeholder="Todos"
          show-clear
          fluid
        />
      </CatalogField>
      <CatalogField :id="id + '-type'" label="Tipo de mensaje">
        <Select
          v-model="key"
          :input-id="id + '-type'"
          :options="keyOptions"
          option-label="label"
          option-value="value"
          placeholder="Todos"
          show-clear
          fluid
        />
      </CatalogField>
      <CatalogField :id="id + '-from'" label="Desde">
        <InputText :id="id + '-from'" v-model="from" type="date" fluid />
      </CatalogField>
      <CatalogField :id="id + '-to'" label="Hasta">
        <InputText :id="id + '-to'" v-model="to" type="date" fluid />
      </CatalogField>
      <Button
        label="Actualizar"
        icon="pi pi-refresh"
        severity="secondary"
        outlined
        :loading="loading"
        @click="load"
      />
    </div>
    <p class="m-0 text-sm text-muted-color">
      Fechas en hora de Miramar, Florida.
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
      <template #empty>No hay envíos para estos filtros.</template>
      <Column field="created" header="Fecha">
        <template #body="{ data }">{{ formatDateTime(data.created) }}</template>
      </Column>
      <Column field="client" header="Cliente">
        <template #body="{ data }">{{
          data.expand?.client
            ? fullName(data.expand.client)
            : 'Cliente no disponible'
        }}</template>
      </Column>
      <Column field="template_key" header="Tipo de mensaje">
        <template #body="{ data }">{{
          MESSAGE_LABELS[data.template_key as MessageLog['template_key']]
        }}</template>
      </Column>
      <Column field="status" header="Estado">
        <template #body="{ data }">
          <Tag
            :value="states[data.status as MessageLog['status']].label"
            :severity="states[data.status as MessageLog['status']].severity"
          />
        </template>
      </Column>
      <Column field="attempts" header="Intentos" />
      <Column field="error" header="Error">
        <template #body="{ data }">{{ data.error || '—' }}</template>
      </Column>
    </DataTable>
  </section>
</template>
