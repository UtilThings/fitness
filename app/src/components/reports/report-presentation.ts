import { t } from '@/i18n';
import { computed } from 'vue';
import { intlLocale } from '@/i18n/formats';
import type { CsvColumn } from '@/lib/csv';
import { formatMoney } from '@/lib/money';
import type { ReportKind, ReportResponse } from '@/types/reports';
import type { ChartSeries, ReportChartType, ValueFormat } from './chart-data';

export const reportTabs = computed(
  () =>
    [
      { value: 'occupancy', label: t('Occupancy'), file: 'ocupacion' },
      { value: 'attendance', label: t('Attendance'), file: 'asistencia' },
      { value: 'revenue', label: t('Revenue'), file: 'ingresos' },
      { value: 'retention', label: t('Retention'), file: 'retencion' },
    ] as const,
);

type DetailColumn = CsvColumn & { percent?: true };
type Row = Record<string, string | number>;
type Detail = { label: string; columns: DetailColumn[]; rows: Row[] };
type ReportPresentation = {
  totals: Row;
  metrics: DetailColumn[];
  details: Detail[];
  chart: {
    type: ReportChartType;
    labels: string[];
    datasets: ChartSeries[];
    valueFormat: ValueFormat;
    ariaLabel: string;
  };
};

const text = (key: string, label: string): DetailColumn => ({ key, label });
const count = (key: string, label: string): DetailColumn => ({
  key,
  label,
  type: 'number',
});
const percent = (key: string, label: string): DetailColumn => ({
  key,
  label,
  percent: true,
});
const money = (key: string, label: string): DetailColumn => ({
  key,
  label,
  type: 'money',
});
const numberFormat = computed(() => new Intl.NumberFormat(intlLocale()));
const percentFormat = computed(
  () =>
    new Intl.NumberFormat(intlLocale(), {
      style: 'percent',
      maximumFractionDigits: 1,
    }),
);

export function displayReportCell(
  value: Row[string] | undefined,
  column: DetailColumn,
) {
  if (value === undefined || value === '') return '—';
  if (typeof value === 'string') return value;
  if (column.percent) return percentFormat.value.format(value);
  if (column.type === 'money') return formatMoney(value);
  return numberFormat.value.format(value);
}

export function exportReportRows(detail: Detail): Row[] {
  return detail.rows.map((row) =>
    Object.fromEntries(
      detail.columns.map((column) => [
        column.key,
        column.percent
          ? displayReportCell(row[column.key], column)
          : row[column.key],
      ]),
    ),
  );
}

export function presentReport(
  kind: ReportKind,
  data: ReportResponse<ReportKind>,
): ReportPresentation {
  const service = text('name', t('Service'));
  const plan = text('name', t('Plan'));
  const period = text('period', t('Period'));
  const booked = count('booked', t('Bookings'));
  const capacity = count('capacity', t('Spots'));
  const occupancy = percent('occupancy_rate', t('Occupancy'));
  const attended = count('attended', t('Attendances'));
  const noShow = count('no_show', t('No-shows'));
  const paid = money('paid_cents', t('Collected'));
  const payments = count('payments', t('Payments'));
  const added = count('new', t('New memberships'));
  const churned = count('churned', t('Ended memberships'));
  const activeEnd = count('active_end', t('Active at end'));

  const occupancyMetrics = [
    count('sessions', t('Classes')),
    capacity,
    booked,
    occupancy,
  ];
  const attendanceMetrics = [
    booked,
    attended,
    noShow,
    count('late_cancelled', t('Late cancellations')),
    count('cancelled', t('Cancellations')),
    percent('attendance_rate', t('Attendance rate')),
    percent('no_show_rate', t('No-show rate')),
  ];
  const revenueMetrics = [
    paid,
    money('pending_cents', t('Pending')),
    money('void_cents', t('Voided')),
    payments,
  ];
  const retentionMetrics = [
    count('active_start', t('Active at start')),
    added,
    churned,
    activeEnd,
    percent('churn_rate', t('Churn rate')),
    percent('retention_rate', t('Retention')),
  ];

  switch (kind) {
    case 'occupancy': {
      const { totals, by_class, by_service } =
        data as ReportResponse<'occupancy'>;
      const names = new Map(by_service.map((row) => [row.service, row.name]));
      const classes = by_class.map((row) => ({
        ...row,
        name: names.get(row.service) ?? row.service,
      }));
      return {
        totals,
        metrics: occupancyMetrics,
        details: [
          {
            label: t('Per class'),
            rows: classes,
            columns: [
              text('local_date', t('Date')),
              text('local_time', t('Time')),
              service,
              text('coach_name', t('Coach')),
              capacity,
              booked,
              count('waitlisted', t('Waitlist')),
              occupancy,
            ],
          },
          {
            label: t('By service'),
            columns: [service, ...occupancyMetrics],
            rows: by_service,
          },
        ],
        chart: {
          type: 'bar',
          valueFormat: 'percent',
          ariaLabel: t('Occupancy by service'),
          labels: by_service.map(({ name }) => name),
          datasets: [
            {
              label: occupancy.label,
              values: by_service.map(({ occupancy_rate }) => occupancy_rate),
            },
          ],
        },
      };
    }
    case 'attendance': {
      const { totals, by_day, by_service } =
        data as ReportResponse<'attendance'>;
      return {
        totals,
        metrics: attendanceMetrics,
        details: [
          {
            label: t('By day'),
            columns: [text('day', t('Date')), ...attendanceMetrics],
            rows: by_day,
          },
          {
            label: t('By service'),
            columns: [service, ...attendanceMetrics],
            rows: by_service,
          },
        ],
        chart: {
          type: 'line',
          valueFormat: 'number',
          ariaLabel: t('Attendances and no-shows by day'),
          labels: by_day.map(({ day }) => day),
          datasets: [
            {
              label: attended.label,
              values: by_day.map((row) => row.attended),
            },
            { label: noShow.label, values: by_day.map((row) => row.no_show) },
          ],
        },
      };
    }
    case 'revenue': {
      const { totals, by_period, by_plan, by_service } =
        data as ReportResponse<'revenue'>;
      return {
        totals,
        metrics: revenueMetrics,
        details: [
          {
            label: t('By period'),
            columns: [period, paid, count('payments', t('Payments collected'))],
            rows: totals.payments ? by_period : [],
          },
          {
            label: t('By plan'),
            columns: [plan, ...revenueMetrics],
            rows: by_plan.map((row) => ({
              ...row,
              name: row.plan ? row.name : t('No plan'),
            })),
          },
          {
            label: t('By service'),
            columns: [service, ...revenueMetrics],
            rows: by_service.map((row) => ({
              ...row,
              name: row.service ? row.name : t('No service'),
            })),
          },
        ],
        chart: {
          type: 'line',
          valueFormat: 'money',
          ariaLabel: t('Collected revenue by period'),
          labels: totals.payments ? by_period.map((row) => row.period) : [],
          datasets: [
            {
              label: paid.label,
              values: by_period.map(({ paid_cents }) => paid_cents),
            },
          ],
        },
      };
    }
    case 'retention': {
      const { totals, by_period, by_plan } =
        data as ReportResponse<'retention'>;
      const hasData = totals.active_start > 0 || totals.new > 0;
      return {
        totals,
        metrics: retentionMetrics,
        details: [
          {
            label: t('By period'),
            columns: [period, added, churned, activeEnd],
            rows: hasData ? by_period : [],
          },
          {
            label: t('By plan'),
            columns: [plan, ...retentionMetrics],
            rows: by_plan.map((row) => ({
              ...row,
              name: row.plan ? row.name : t('No plan'),
            })),
          },
        ],
        chart: {
          type: 'bar',
          valueFormat: 'number',
          ariaLabel: t('Membership starts and ends by period'),
          labels: hasData ? by_period.map((row) => row.period) : [],
          datasets: [
            { label: added.label, values: by_period.map((row) => row.new) },
            {
              label: churned.label,
              values: by_period.map((row) => row.churned),
            },
          ],
        },
      };
    }
  }
}
