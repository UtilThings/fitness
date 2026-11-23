import type { CsvColumn } from '@/lib/csv';
import { formatUsd } from '@/lib/money';
import type { ReportKind, ReportResponse } from '@/types/reports';
import type { ChartSeries, ReportChartType, ValueFormat } from './chart-data';

export const reportTabs = [
  { value: 'occupancy', label: 'Ocupación', file: 'ocupacion' },
  { value: 'attendance', label: 'Asistencia', file: 'asistencia' },
  { value: 'revenue', label: 'Ingresos', file: 'ingresos' },
  { value: 'retention', label: 'Retención', file: 'retencion' },
] as const;

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
const service = text('name', 'Servicio');
const plan = text('name', 'Plan');
const period = text('period', 'Periodo');
const booked = count('booked', 'Reservas');
const capacity = count('capacity', 'Cupos');
const occupancy = percent('occupancy_rate', 'Ocupación');
const attended = count('attended', 'Asistencias');
const noShow = count('no_show', 'Inasistencias');
const paid = money('paid_cents', 'Cobrado');
const payments = count('payments', 'Pagos');
const added = count('new', 'Altas');
const churned = count('churned', 'Bajas');
const activeEnd = count('active_end', 'Activas al cierre');

const occupancyMetrics = [
  count('sessions', 'Clases'),
  capacity,
  booked,
  occupancy,
];
const attendanceMetrics = [
  booked,
  attended,
  noShow,
  count('late_cancelled', 'Cancelaciones tardías'),
  count('cancelled', 'Cancelaciones'),
  percent('attendance_rate', 'Tasa de asistencia'),
  percent('no_show_rate', 'Tasa de inasistencia'),
];
const revenueMetrics = [
  paid,
  money('pending_cents', 'Pendiente'),
  money('void_cents', 'Anulado'),
  payments,
];
const retentionMetrics = [
  count('active_start', 'Activas al inicio'),
  added,
  churned,
  activeEnd,
  percent('churn_rate', 'Tasa de bajas'),
  percent('retention_rate', 'Retención'),
];

const numberFormat = new Intl.NumberFormat('es-US');
const percentFormat = new Intl.NumberFormat('es-US', {
  style: 'percent',
  maximumFractionDigits: 1,
});

export function displayReportCell(
  value: Row[string] | undefined,
  column: DetailColumn,
) {
  if (value === undefined || value === '') return '—';
  if (typeof value === 'string') return value;
  if (column.percent) return percentFormat.format(value);
  if (column.type === 'money') return formatUsd(value);
  return numberFormat.format(value);
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
            label: 'Por clase',
            rows: classes,
            columns: [
              text('local_date', 'Fecha'),
              text('local_time', 'Hora'),
              service,
              text('coach_name', 'Coach'),
              capacity,
              booked,
              count('waitlisted', 'Lista de espera'),
              occupancy,
            ],
          },
          {
            label: 'Por servicio',
            columns: [service, ...occupancyMetrics],
            rows: by_service,
          },
        ],
        chart: {
          type: 'bar',
          valueFormat: 'percent',
          ariaLabel: 'Ocupación por servicio',
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
            label: 'Por día',
            columns: [text('day', 'Fecha'), ...attendanceMetrics],
            rows: by_day,
          },
          {
            label: 'Por servicio',
            columns: [service, ...attendanceMetrics],
            rows: by_service,
          },
        ],
        chart: {
          type: 'line',
          valueFormat: 'number',
          ariaLabel: 'Asistencias e inasistencias por día',
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
            label: 'Por periodo',
            columns: [period, paid, count('payments', 'Pagos cobrados')],
            rows: totals.payments ? by_period : [],
          },
          {
            label: 'Por plan',
            columns: [plan, ...revenueMetrics],
            rows: by_plan,
          },
          {
            label: 'Por servicio',
            columns: [service, ...revenueMetrics],
            rows: by_service,
          },
        ],
        chart: {
          type: 'line',
          valueFormat: 'money',
          ariaLabel: 'Ingresos cobrados por periodo',
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
            label: 'Por periodo',
            columns: [period, added, churned, activeEnd],
            rows: hasData ? by_period : [],
          },
          {
            label: 'Por plan',
            columns: [plan, ...retentionMetrics],
            rows: by_plan,
          },
        ],
        chart: {
          type: 'bar',
          valueFormat: 'number',
          ariaLabel: 'Altas y bajas por periodo',
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
