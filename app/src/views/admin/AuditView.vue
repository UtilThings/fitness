<script setup lang="ts">
import { t } from '@/i18n';
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
import {
  ACTION_LABELS,
  COLLECTION_LABELS,
  auditSummary,
  formatDiff,
} from '@/lib/audit';
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
    t('System')
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
  return value === undefined ? '—' : value === '' ? t('(empty)') : value;
}
</script>

<template>
  <div class="grid min-w-0 gap-4">
    <PageHeader :title="t('Audit log')" />
    <form
      class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      @submit.prevent="applyFilters"
    >
      <div class="grid min-w-0 gap-1">
        <label id="audit-collection-label" for="audit-collection">{{
          t('Collection')
        }}</label>
        <Select
          v-model="draft.collection"
          input-id="audit-collection"
          aria-labelledby="audit-collection-label"
          :options="collectionOptions"
          option-label="label"
          option-value="value"
          :placeholder="t('All collections')"
          show-clear
          fluid
        />
      </div>
      <div class="grid min-w-0 gap-1">
        <label id="audit-actor-label" for="audit-actor">{{ t('Actor') }}</label>
        <Select
          v-model="draft.actor"
          input-id="audit-actor"
          aria-labelledby="audit-actor-label"
          :options="actorOptions"
          option-label="label"
          option-value="value"
          :placeholder="t('All actors')"
          show-clear
          fluid
        />
      </div>
      <div class="grid min-w-0 gap-1">
        <label for="audit-from">{{ t('From') }}</label>
        <InputText id="audit-from" v-model="draft.from" type="date" fluid />
      </div>
      <div class="grid min-w-0 gap-1">
        <label for="audit-to">{{ t('To') }}</label>
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
        {{ t('The end date must be on or after the start date.') }}
      </Message>
      <div class="flex flex-wrap gap-2 sm:col-span-2 xl:col-span-4">
        <Button type="submit" :label="t('Filter')" :disabled="invalidRange" />
        <Button
          :label="t('Clear filters')"
          severity="secondary"
          outlined
          @click="clearFilters"
        />
      </div>
    </form>

    <Message v-if="actorsError" severity="warn">
      {{ t('Could not load the actors.') }}
      <Button :label="t('Retry loading actors')" text @click="loadActors" />
    </Message>
    <Message v-if="error" severity="error">
      {{ error.message }}
      <Button :label="t('Retry')" text @click="load()" />
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
      :table-props="{ 'aria-label': t('Audit records') }"
      @page="changePage"
    >
      <template #empty>
        <p v-if="!loading">{{ t('No records found.') }}</p>
      </template>
      <Column :header="t('Date')">
        <template #body="{ data }">{{ formatDateTime(data.created) }}</template>
      </Column>
      <Column :header="t('Actor')">
        <template #body="{ data }">{{ actorLabel(data) }}</template>
      </Column>
      <Column :header="t('Action')">
        <template #body="{ data }">{{
          ACTION_LABELS[data.action as AuditLog['action']]
        }}</template>
      </Column>
      <Column :header="t('Collection')">
        <template #body="{ data }">{{
          COLLECTION_LABELS[data.collection] ?? data.collection
        }}</template>
      </Column>
      <Column field="summary" :header="t('Summary')" body-class="wrap-anywhere">
        <template #body="{ data }">{{ auditSummary(data.summary) }}</template>
      </Column>
      <Column :header="t('Changes')">
        <template #body="{ data }">
          <Button
            :label="t('View changes')"
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
      :header="t('Record changes')"
      class="w-[min(46rem,calc(100vw-2rem))]"
      @update:visible="
        (visible) => {
          if (!visible) selected = undefined;
        }
      "
    >
      <template v-if="selected">
        <p class="mb-1 wrap-anywhere font-medium">
          {{ auditSummary(selected.summary) }}
        </p>
        <p class="mb-4 wrap-anywhere text-sm">
          {{ t('Record') }} {{ selected.record_id }}
        </p>
        <p v-if="!diff.length">{{ t('No field changes.') }}</p>
        <dl v-else class="grid gap-4">
          <div
            v-for="row in diff"
            :key="row.field"
            class="grid gap-2 border-b border-surface-200 pb-3 dark:border-surface-700"
          >
            <dt class="wrap-anywhere font-semibold">{{ row.field }}</dt>
            <dd class="grid min-w-0 gap-2 sm:grid-cols-2">
              <div class="min-w-0">
                <p class="text-sm font-medium">{{ t('Before') }}</p>
                <pre class="wrap-anywhere text-sm whitespace-pre-wrap">{{
                  displayValue(row.before)
                }}</pre>
              </div>
              <div class="min-w-0">
                <p class="text-sm font-medium">{{ t('After') }}</p>
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
