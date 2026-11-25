<script setup lang="ts">
import { t } from '@/i18n';
import {
  computed,
  defineAsyncComponent,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
} from 'vue';
import {
  buildChartData,
  buildChartOptions,
  formatChartValue,
  type ChartSeries,
  type ChartTheme,
  type ReportChartType,
  type ValueFormat,
} from './chart-data';

const props = withDefaults(
  defineProps<{
    type: ReportChartType;
    labels: readonly string[];
    datasets: readonly ChartSeries[];
    ariaLabel: string;
    loading?: boolean;
    valueFormat?: ValueFormat;
  }>(),
  { loading: false, valueFormat: 'number' },
);

const Chart = defineAsyncComponent(() => import('primevue/chart'));
const container = ref<HTMLElement>();
const theme = shallowRef<ChartTheme>({
  series: ['#059669', '#2563eb', '#b45309', '#7c3aed'],
  text: '#334155',
  grid: '#e2e8f0',
  surface: '#ffffff',
});
const hasData = computed(
  () =>
    props.labels.length > 0 &&
    props.datasets.some(({ values }) => values.length > 0),
);
const data = computed(() =>
  buildChartData(
    props.type,
    props.labels,
    props.datasets,
    props.valueFormat,
    theme.value,
  ),
);
const options = computed(() =>
  buildChartOptions(props.type, props.valueFormat, theme.value),
);

function readTheme() {
  if (!container.value) return;
  const styles = getComputedStyle(container.value);
  const dark = !!container.value.closest('.app-dark');
  const color = (token: string, fallback: string) =>
    styles.getPropertyValue(token).trim() || fallback;
  const shade = dark ? 400 : 600;
  theme.value = {
    series: [
      color(`--p-primary-${shade}`, dark ? '#34d399' : '#059669'),
      color(`--p-blue-${shade}`, dark ? '#60a5fa' : '#2563eb'),
      color(`--p-amber-${shade}`, dark ? '#fbbf24' : '#b45309'),
      color(`--p-violet-${shade}`, dark ? '#a78bfa' : '#7c3aed'),
    ],
    text: color('--p-text-color', dark ? '#e2e8f0' : '#334155'),
    grid: color(
      dark ? '--p-surface-700' : '--p-surface-200',
      dark ? '#334155' : '#e2e8f0',
    ),
    surface: color(
      dark ? '--p-surface-900' : '--p-surface-0',
      dark ? '#0f172a' : '#ffffff',
    ),
  };
}

let observer: MutationObserver | undefined;
onMounted(() => {
  readTheme();
  observer = new MutationObserver(readTheme);
  for (
    let parent = container.value?.parentElement;
    parent;
    parent = parent.parentElement
  ) {
    observer.observe(parent, { attributes: true, attributeFilter: ['class'] });
  }
});
onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <div ref="container">
    <p v-if="loading" role="status" class="p-6 text-center text-muted-color">
      {{ t('Loading chart…') }}
    </p>
    <p v-else-if="!hasData" class="p-6 text-center text-muted-color">
      {{ t('No data in the date range') }}
    </p>
    <template v-else>
      <div role="img" :aria-label="ariaLabel">
        <Chart
          class="h-72"
          :type="type"
          :data="data"
          :options="options"
          :canvas-props="{ 'aria-hidden': true }"
        />
      </div>
      <table class="sr-only">
        <caption>
          {{
            ariaLabel
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col">{{ t('Category') }}</th>
            <th v-for="(series, index) in datasets" :key="index" scope="col">
              {{ series.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(label, index) in labels" :key="index">
            <th scope="row">{{ label }}</th>
            <td v-for="(series, column) in data.datasets" :key="column">
              {{
                series.data[index] === undefined
                  ? '—'
                  : formatChartValue(series.data[index], valueFormat)
              }}
            </td>
          </tr>
        </tbody>
      </table>
    </template>
  </div>
</template>
