<script setup lang="ts">
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import DatePicker from 'primevue/datepicker';
import Message from 'primevue/message';
import Select from 'primevue/select';
import Tab from 'primevue/tab';
import TabList from 'primevue/tablist';
import TabPanel from 'primevue/tabpanel';
import TabPanels from 'primevue/tabpanels';
import Tabs from 'primevue/tabs';
import { computed, onMounted, ref, useId, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageHeader from '@/components/PageHeader.vue';
import ReportChart from '@/components/reports/ReportChart.vue';
import {
  displayReportCell,
  exportReportRows,
  presentReport,
  reportTabs,
} from '@/components/reports/report-presentation';
import { useAuth } from '@/composables/useAuth';
import { useCollection } from '@/composables/useCollection';
import { useReports } from '@/composables/useReports';
import type { Service } from '@/lib/catalog';
import { csvFilename, downloadCsv, toCsv } from '@/lib/csv';
import type { ReportPreset } from '@/types/reports';

const presets = [
  { value: '7d', label: 'Últimos 7 días' },
  { value: '30d', label: 'Últimos 30 días' },
  { value: 'this-month', label: 'Mes actual' },
  { value: 'last-month', label: 'Mes anterior' },
] as const satisfies readonly { value: ReportPreset; label: string }[];
const groups = [
  { value: 'day', label: 'Día' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
];

const id = useId();
const route = useRoute();
const router = useRouter();
const { isOwner, isAuthenticated, isActive } = useAuth();
const owner = computed(
  () => isOwner.value && isAuthenticated.value && isActive.value,
);
const tab = computed(
  () =>
    reportTabs.find(({ value }) => value === route.query.tab) ?? reportTabs[0],
);
const kind = computed(() => tab.value.value);
const visibleTabs = computed(() =>
  reportTabs.filter(({ value }) => value !== 'revenue' || owner.value),
);
const denied = computed(() => kind.value === 'revenue' && !owner.value);
const grouped = computed(
  () => kind.value === 'revenue' || kind.value === 'retention',
);

const {
  range,
  preset,
  service,
  groupBy,
  data,
  loading,
  error,
  load,
  setPreset,
  clear,
} = useReports(kind);
const {
  items: services,
  loading: loadingServices,
  error: serviceError,
  load: loadServices,
} = useCollection<Pick<Service, 'slug' | 'name'>>('services', {
  fullList: true,
  sort: 'name',
  fields: 'slug,name',
});
const serviceOptions = computed(() => [
  { slug: '', name: 'Todos los servicios' },
  ...services.value,
]);

const detailIndex = ref(0);
const presentation = computed(
  () => data.value && presentReport(kind.value, data.value),
);
const detail = computed(() => presentation.value?.details[detailIndex.value]);
const detailOptions = computed(
  () =>
    presentation.value?.details.map(({ label }, index) => ({
      label,
      value: index,
    })) ?? [],
);

function pickerDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date;
}

function civilDate(date: Date) {
  return [
    String(date.getFullYear()).padStart(4, '0'),
    date.getMonth() + 1,
    date.getDate(),
  ]
    .map((part) => String(part).padStart(2, '0'))
    .join('-');
}

const pickerRange = ref<(Date | null)[]>([]);
watch(
  range,
  ({ from, to }) => {
    pickerRange.value = [pickerDate(from), pickerDate(to)];
  },
  { immediate: true },
);
const rangeComplete = computed(
  () => !!pickerRange.value[0] && !!pickerRange.value[1],
);

function changeRange(value: Date | (Date | null)[] | null | undefined) {
  if (!Array.isArray(value)) return;
  pickerRange.value = value;
  const [from, to] = value;
  if (!from || !to) return;
  preset.value = null;
  range.value = { from: civilDate(from), to: civilDate(to) };
}

function changeTab(value: string | number) {
  if (
    !visibleTabs.value.some((entry) => entry.value === value) ||
    typeof value !== 'string'
  )
    return;
  void router.replace({ query: { ...route.query, tab: value } });
}

function exportCsv() {
  if (
    loading.value ||
    !data.value ||
    !detail.value?.rows.length ||
    !rangeComplete.value ||
    denied.value
  )
    return;
  const { from, to } = data.value.range;
  downloadCsv(
    csvFilename(tab.value.file, from, to),
    toCsv(detail.value.columns, exportReportRows(detail.value)),
  );
}

watch(kind, () => {
  detailIndex.value = 0;
});
watch(
  [
    kind,
    denied,
    isAuthenticated,
    isActive,
    () => range.value.from,
    () => range.value.to,
    service,
    groupBy,
  ],
  () => {
    if (denied.value || !isAuthenticated.value || !isActive.value) clear();
    else void load();
  },
  { immediate: true },
);
onMounted(() => {
  void loadServices();
});
</script>

<template>
  <div class="space-y-5 p-4 md:p-6">
    <PageHeader title="Reportes">
      <template #actions>
        <Button
          label="Exportar CSV"
          icon="pi pi-download"
          severity="secondary"
          :disabled="
            denied || loading || !detail?.rows.length || !rangeComplete
          "
          @click="exportCsv"
        />
      </template>
    </PageHeader>

    <Tabs :value="kind" scrollable @update:value="changeTab">
      <TabList>
        <Tab
          v-for="entry in visibleTabs"
          :key="entry.value"
          :value="entry.value"
          >{{ entry.label }}</Tab
        >
      </TabList>
      <Message v-if="denied" severity="warn" class="mt-4" :closable="false">
        No tienes permiso para ver este reporte
      </Message>
      <TabPanels v-else :pt="{ root: { class: 'p-0! mt-4' } }">
        <TabPanel :value="kind" class="space-y-5">
          <section
            class="space-y-4 rounded-xl border border-surface-200 bg-surface-0 p-4 dark:border-surface-700 dark:bg-surface-900"
          >
            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div class="flex min-w-0 flex-col gap-1">
                <label :for="`${id}-range`" class="text-sm font-medium"
                  >Rango de fechas</label
                >
                <DatePicker
                  :input-id="`${id}-range`"
                  :model-value="pickerRange"
                  selection-mode="range"
                  date-format="yy-mm-dd"
                  show-icon
                  readonly-input
                  fluid
                  @update:model-value="changeRange"
                />
              </div>
              <div
                v-if="kind !== 'retention'"
                class="flex min-w-0 flex-col gap-1"
              >
                <label :for="`${id}-service`" class="text-sm font-medium"
                  >Servicio</label
                >
                <Select
                  v-model="service"
                  :input-id="`${id}-service`"
                  :options="serviceOptions"
                  :loading="loadingServices"
                  option-label="name"
                  option-value="slug"
                  fluid
                />
                <small
                  v-if="serviceError"
                  role="alert"
                  class="text-red-700 dark:text-red-300"
                >
                  No se pudieron cargar los servicios.
                </small>
              </div>
              <div v-if="grouped" class="flex min-w-0 flex-col gap-1">
                <label :for="`${id}-group`" class="text-sm font-medium"
                  >Agrupar por</label
                >
                <Select
                  v-model="groupBy"
                  :input-id="`${id}-group`"
                  :options="groups"
                  option-label="label"
                  option-value="value"
                  fluid
                />
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <Button
                v-for="option in presets"
                :key="option.value"
                :label="option.label"
                :aria-pressed="preset === option.value"
                :severity="preset === option.value ? 'primary' : 'secondary'"
                :outlined="preset !== option.value"
                size="small"
                @click="setPreset(option.value)"
              />
            </div>
          </section>

          <Message v-if="error" severity="error" :closable="false">{{
            error
          }}</Message>
          <p
            v-else-if="loading"
            role="status"
            class="p-6 text-center text-muted-color"
          >
            Cargando reporte…
          </p>

          <template v-if="presentation">
            <dl class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              <div
                v-for="metric in presentation.metrics"
                :key="metric.key"
                class="rounded-xl border border-surface-200 bg-surface-0 p-4 dark:border-surface-700 dark:bg-surface-900"
              >
                <dt class="text-sm text-muted-color">{{ metric.label }}</dt>
                <dd class="mt-1 text-xl font-semibold tabular-nums">
                  {{
                    displayReportCell(presentation.totals[metric.key], metric)
                  }}
                </dd>
              </div>
            </dl>
            <section
              class="min-w-0 rounded-xl border border-surface-200 bg-surface-0 p-4 dark:border-surface-700 dark:bg-surface-900"
            >
              <h2 class="mb-3 font-semibold">
                {{ presentation.chart.ariaLabel }}
              </h2>
              <ReportChart v-bind="presentation.chart" />
            </section>
            <section
              v-if="detail"
              class="overflow-hidden rounded-xl border border-surface-200 bg-surface-0 dark:border-surface-700 dark:bg-surface-900"
            >
              <div
                class="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <h2 class="font-semibold">Detalle</h2>
                <Select
                  v-model="detailIndex"
                  aria-label="Detalle por"
                  :options="detailOptions"
                  option-label="label"
                  option-value="value"
                />
              </div>
              <DataTable
                :key="detail.label"
                :value="detail.rows"
                :rows="15"
                :paginator="detail.rows.length > 15"
                size="small"
              >
                <Column
                  v-for="column in detail.columns"
                  :key="column.key"
                  :field="column.key"
                  :header="column.label"
                >
                  <template #body="{ data: row }">{{
                    displayReportCell(row[column.key], column)
                  }}</template>
                </Column>
                <template #empty>Sin datos en el rango</template>
              </DataTable>
            </section>
          </template>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>
