import type { ChartData, ChartOptions } from 'chart.js';

export type ReportChartType = 'bar' | 'line' | 'doughnut';
export type ValueFormat = 'number' | 'percent' | 'money';
export type ChartSeries = { label: string; values: readonly number[] };
export type ChartTheme = {
  series: string[];
  text: string;
  grid: string;
  surface: string;
};

export function buildChartData(
  type: ReportChartType,
  labels: readonly string[],
  series: readonly ChartSeries[],
  format: ValueFormat,
  theme: ChartTheme,
): ChartData<ReportChartType, number[], string> {
  return {
    labels: [...labels],
    datasets: series.map(({ label, values }, index) => {
      const color = theme.series[index % theme.series.length];
      return {
        label,
        data: values.map((value) => {
          if (format === 'money') return value / 100;
          if (format === 'percent') return Math.round(value * 1_000) / 10;
          return value;
        }),
        backgroundColor:
          type === 'doughnut'
            ? values.map((_, i) => theme.series[i % theme.series.length])
            : color,
        borderColor: type === 'doughnut' ? theme.surface : color,
      };
    }),
  };
}

export function formatChartValue(value: number, format: ValueFormat): string {
  if (format === 'money') {
    return new Intl.NumberFormat('es-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  }
  if (format === 'percent') {
    return new Intl.NumberFormat('es-US', {
      style: 'percent',
      maximumFractionDigits: 1,
    }).format(value / 100);
  }
  return new Intl.NumberFormat('es-US').format(value);
}

export function buildChartOptions(
  type: ReportChartType,
  format: ValueFormat,
  theme: ChartTheme,
): ChartOptions<ReportChartType> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    color: theme.text,
    plugins: {
      legend: { display: true, labels: { color: theme.text } },
      tooltip: {
        callbacks: {
          label: ({ dataset, raw }) => {
            const value = formatChartValue(Number(raw), format);
            return type === 'doughnut' || !dataset.label
              ? value
              : `${dataset.label}: ${value}`;
          },
        },
      },
    },
    ...(type !== 'doughnut' && {
      scales: {
        x: {
          ticks: { color: theme.text, maxTicksLimit: 12 },
          grid: { color: theme.grid },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: theme.text,
            callback: (value) => formatChartValue(Number(value), format),
          },
          grid: { color: theme.grid },
        },
      },
    }),
  };
}
