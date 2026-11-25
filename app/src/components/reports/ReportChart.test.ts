import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { expect, it, vi } from 'vitest';
import ReportChart from './ReportChart.vue';
import { withLocale } from '@/test/i18n';
import {
  buildChartData,
  buildChartOptions,
  formatChartValue,
} from './chart-data';
import { displayReportCell } from './report-presentation';

vi.mock('primevue/chart', () => ({
  __esModule: true,
  default: defineComponent({ template: '<canvas data-test="chart" />' }),
}));

const theme = {
  series: ['green', 'blue'],
  text: 'white',
  grid: 'gray',
  surface: 'black',
};

it('builds chart series, converting money and proportions for plotting', () => {
  const series = [{ label: 'Total', values: [26800, 0] }];
  const money = buildChartData(
    'bar',
    ['Marzo', 'Abril'],
    series,
    'money',
    theme,
  );
  expect(money.labels).toEqual(['Marzo', 'Abril']);
  expect(money.datasets[0]).toMatchObject({
    data: [268, 0],
    label: 'Total',
    backgroundColor: 'green',
  });
  expect(
    buildChartData(
      'doughnut',
      ['A', 'B'],
      [{ label: 'Ocupación', values: [0.8333, 0.1667] }],
      'percent',
      theme,
    ).datasets[0],
  ).toMatchObject({
    data: [83.3, 16.7],
    backgroundColor: ['green', 'blue'],
  });
  expect(buildChartOptions('line', 'money', theme)).toMatchObject({
    responsive: true,
    maintainAspectRatio: false,
    scales: { y: { ticks: { color: 'white' } } },
  });
  expect(buildChartOptions('doughnut', 'number', theme)).not.toHaveProperty(
    'scales',
  );
});

it('shows loading and empty states, then mounts a labelled chart with an accessible table', async () => {
  const wrapper = mount(ReportChart, {
    props: {
      type: 'bar',
      labels: [],
      datasets: [],
      ariaLabel: 'Ingresos por mes',
      loading: true,
    },
  });
  expect(wrapper.get('[role="status"]').text()).toContain('Cargando');
  expect(wrapper.find('[role="img"]').exists()).toBe(false);
  await wrapper.setProps({ loading: false });
  expect(wrapper.text()).toContain('Sin datos en el rango');
  expect(wrapper.find('canvas').exists()).toBe(false);
  await wrapper.setProps({
    labels: ['Marzo'],
    datasets: [{ label: 'Ingresos', values: [26800] }],
    valueFormat: 'money',
  });
  await flushPromises();
  expect(wrapper.get('[role="img"]').attributes('aria-label')).toBe(
    'Ingresos por mes',
  );
  expect(wrapper.find('canvas').exists()).toBe(true);
  expect(wrapper.get('table').text()).toContain('$268.00');
  wrapper.unmount();
});

it.each(['en', 'es'] as const)(
  'formats chart data and report cells for %s',
  async (locale) => {
    await withLocale(locale, () => {
      const formatter = new Intl.NumberFormat(`${locale}-US`, {
        style: 'percent',
        maximumFractionDigits: 1,
      });
      const expected = formatter.format(0.456);
      expect(formatChartValue(45.6, 'percent')).toBe(expected);
      expect(
        displayReportCell(0.456, { key: 'rate', label: 'Rate', percent: true }),
      ).toBe(expected);
    });
  },
);
