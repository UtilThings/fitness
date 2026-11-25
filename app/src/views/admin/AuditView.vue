<script setup lang="ts">
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable, { type DataTablePageEvent } from 'primevue/datatable';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';
import { computed, onMounted, reactive, shallowRef } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import { AUDIT_PAGE_SIZE, useAuditLogs } from '@/composables/useAuditLogs';
import { ACTION_LABELS, COLLECTION_LABELS, formatDiff } from '@/lib/audit';
import { formatDateTime } from '@/lib/datetime';
import type { AuditLog } from '@/types/pb';

const {
  items,
  actors,
  page,
  totalItems,
  loading,
  error,
  actorsError,
  load,
  setFilters,
  loadActors,
} = useAuditLogs();
const draft = reactive({ collection: '', actor: '', from: '', to: '' });
const selected = shallowRef<AuditLog>();
const diff = computed(() => formatDiff(selected.value?.diff));
const invalidRange = computed(() =>
  Boolean(draft.from && draft.to && draft.from > draft.to),
);
const collectionOptions = computed(() =>
  Object.entries(COLLECTION_LABELS.value).map(([value, label]) => ({
    value,
    label,
  })),
);
const actorOptions = computed(() =>
  actors.value.map(({ id, name, email }) => ({
    value: id,
    label: name || email,
  })),
);

onMounted(() => {
  void load();
  void loadActors();
});

function actorLabel(log: AuditLog) {
  return (
    log.expand?.actor?.name ||
    log.expand?.actor?.email ||
    log.actor ||
    'Sistema'
  );
}

function applyFilters() {
  if (!invalidRange.value) void setFilters(draft);
}

function clearFilters() {
  Object.assign(draft, { collection: '', actor: '', from: '', to: '' });
  applyFilters();
}

function changePage(event: DataTablePageEvent) {
  return load(event.page + 1);
}

function displayValue(value: string | undefined) {
  return value === undefined ? '—' : value === '' ? '(vacío)' : value;
}
</script>

<template>
  <div class="grid min-w-0 gap-4">
    <PageHeader title="Auditoría" />
    <form
      class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      @submit.prevent="applyFilters"
    >
      <div class="grid min-w-0 gap-1">
        <label id="audit-collection-label" for="audit-collection"
          >Colección</label
        >
        <Select
          v-model="draft.collection"
          input-id="audit-collection"
          aria-labelledby="audit-collection-label"
          :options="collectionOptions"
          option-label="label"
          option-value="value"
          placeholder="Todas las colecciones"
          show-clear
          fluid
        />
      </div>
      <div class="grid min-w-0 gap-1">
        <label id="audit-actor-label" for="audit-actor">Actor</label>
        <Select
          v-model="draft.actor"
          input-id="audit-actor"
          aria-labelledby="audit-actor-label"
          :options="actorOptions"
          option-label="label"
          option-value="value"
          placeholder="Todos los actores"
          show-clear
          fluid
        />
      </div>
      <div class="grid min-w-0 gap-1">
        <label for="audit-from">Desde</label>
        <InputText id="audit-from" v-model="draft.from" type="date" fluid />
      </div>
      <div class="grid min-w-0 gap-1">
        <label for="audit-to">Hasta</label>
        <InputText
          id="audit-to"
          v-model="draft.to"
          type="date"
          fluid
          :invalid="invalidRange"
        />
      </div>
      <Message
        v-if="invalidRange"
        severity="warn"
        class="sm:col-span-2 xl:col-span-4"
      >
        La fecha final debe ser igual o posterior a la inicial.
      </Message>
      <div class="flex flex-wrap gap-2 sm:col-span-2 xl:col-span-4">
        <Button type="submit" label="Filtrar" :disabled="invalidRange" />
        <Button
          label="Limpiar filtros"
          severity="secondary"
          outlined
          @click="clearFilters"
        />
      </div>
    </form>

    <Message v-if="actorsError" severity="warn">
      No se pudieron cargar los actores.
      <Button label="Reintentar actores" text @click="loadActors" />
    </Message>
    <Message v-if="error" severity="error">
      {{ error.message }}
      <Button label="Reintentar" text @click="load()" />
    </Message>

    <DataTable
      v-else
      :value="items"
      :loading="loading"
      :rows="AUDIT_PAGE_SIZE"
      :first="(page - 1) * AUDIT_PAGE_SIZE"
      :total-records="totalItems"
      :paginator="totalItems > AUDIT_PAGE_SIZE"
      lazy
      data-key="id"
      :table-props="{ 'aria-label': 'Registros de auditoría' }"
      @page="changePage"
    >
      <template #empty>
        <p v-if="!loading">No se encontraron registros.</p>
      </template>
      <Column header="Fecha">
        <template #body="{ data }">{{ formatDateTime(data.created) }}</template>
      </Column>
      <Column header="Actor">
        <template #body="{ data }">{{ actorLabel(data) }}</template>
      </Column>
      <Column header="Acción">
        <template #body="{ data }">{{
          ACTION_LABELS[data.action as AuditLog['action']]
        }}</template>
      </Column>
      <Column header="Colección">
        <template #body="{ data }">{{
          COLLECTION_LABELS[data.collection] ?? data.collection
        }}</template>
      </Column>
      <Column field="summary" header="Resumen" body-class="wrap-anywhere" />
      <Column header="Cambios">
        <template #body="{ data }">
          <Button
            label="Ver cambios"
            text
            size="small"
            @click="selected = data"
          />
        </template>
      </Column>
    </DataTable>

    <Dialog
      :visible="!!selected"
      modal
      header="Cambios del registro"
      class="w-[min(46rem,calc(100vw-2rem))]"
      @update:visible="
        (visible) => {
          if (!visible) selected = undefined;
        }
      "
    >
      <template v-if="selected">
        <p class="mb-1 wrap-anywhere font-medium">{{ selected.summary }}</p>
        <p class="mb-4 wrap-anywhere text-sm">
          Registro {{ selected.record_id }}
        </p>
        <p v-if="!diff.length">Sin cambios de campos.</p>
        <dl v-else class="grid gap-4">
          <div
            v-for="row in diff"
            :key="row.field"
            class="grid gap-2 border-b border-surface-200 pb-3 dark:border-surface-700"
          >
            <dt class="wrap-anywhere font-semibold">{{ row.field }}</dt>
            <dd class="grid min-w-0 gap-2 sm:grid-cols-2">
              <div class="min-w-0">
                <p class="text-sm font-medium">Antes</p>
                <pre class="wrap-anywhere text-sm whitespace-pre-wrap">{{
                  displayValue(row.before)
                }}</pre>
              </div>
              <div class="min-w-0">
                <p class="text-sm font-medium">Después</p>
                <pre class="wrap-anywhere text-sm whitespace-pre-wrap">{{
                  displayValue(row.after)
                }}</pre>
              </div>
            </dd>
          </div>
        </dl>
      </template>
    </Dialog>
  </div>
</template>
