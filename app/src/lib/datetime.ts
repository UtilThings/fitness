import { computed } from 'vue';
import { businessTimezone } from './business-session';

const HOUR_MS = 3_600_000;
const displayDate = { dateStyle: 'medium' } as const;
const displayTime = { timeStyle: 'short', hour12: true } as const;

function businessFormatter(
  options: Intl.DateTimeFormatOptions,
  locale = 'es-US',
) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: businessTimezone.value,
    ...options,
  });
}

const dateFormatter = computed(() => businessFormatter(displayDate));
const timeFormatter = computed(() => businessFormatter(displayTime));
const englishTimeFormatter = computed(() =>
  businessFormatter(displayTime, 'en-US'),
);
const dateTimeFormatter = computed(() =>
  businessFormatter({ ...displayDate, ...displayTime }),
);
const partsFormatter = computed(() =>
  businessFormatter(
    {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    },
    'en-US',
  ),
);

function utcDate(iso: string): Date {
  return new Date(iso.replace(' ', 'T'));
}

export function formatDate(iso: string): string {
  return dateFormatter.value.format(utcDate(iso));
}

export function formatTime(
  iso: string,
  locale: 'es-US' | 'en-US' = 'es-US',
): string {
  return (
    locale === 'en-US' ? englishTimeFormatter : timeFormatter
  ).value.format(utcDate(iso));
}

export function formatDateTime(iso: string): string {
  return dateTimeFormatter.value.format(utcDate(iso));
}

function instantParts(instant: Date | number) {
  const parts = Object.fromEntries(
    partsFormatter.value
      .formatToParts(instant)
      .map(({ type, value }) => [type, value]),
  );
  return {
    date: `${parts.year.padStart(4, '0')}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    second: parts.second,
  };
}

export function utcToLocalParts(iso: string): {
  date: string;
  time: string;
  weekday: number;
} {
  const { date, time } = instantParts(utcDate(iso));
  return { date, time, weekday: new Date(`${date}T00:00:00Z`).getUTCDay() };
}

function offsetAt(instant: number): number {
  const { date, time, second } = instantParts(instant);
  return Date.parse(`${date}T${time}:${second}Z`) - instant;
}

export function localToUtcIso(date: string, time: string): string {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
  ) {
    throw new RangeError('Se espera una fecha YYYY-MM-DD y una hora HH:mm');
  }

  const wallTime = Date.parse(`${date}T${time}:00Z`);
  if (
    !Number.isFinite(wallTime) ||
    new Date(wallTime).toISOString().slice(0, 10) !== date
  ) {
    throw new RangeError(`Fecha local inválida: ${date}`);
  }

  const before = wallTime - offsetAt(wallTime - 24 * HOUR_MS);
  const after = wallTime - offsetAt(wallTime + 24 * HOUR_MS);
  // En el solapamiento coincide la primera ocurrencia. En el salto, el offset
  // previo interpreta la hora como si aún fuera estándar y la desplaza hacia adelante.
  const first = instantParts(before);
  const second = instantParts(after);
  const instant =
    first.date === date && first.time === time
      ? before
      : second.date === date && second.time === time
        ? after
        : before;
  return new Date(instant).toISOString();
}

export function todayLocal(): string {
  return instantParts(new Date()).date;
}

export const localParts = utcToLocalParts;

export function addLocalDays(date: string, days: number): string {
  const civilDate = new Date(`${date}T00:00:00Z`);
  civilDate.setUTCDate(civilDate.getUTCDate() + days);
  return civilDate.toISOString().slice(0, 10);
}

const dayFormatter = computed(() =>
  businessFormatter({
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }),
);

export function formatDayLabel(date: string): string {
  return dayFormatter.value.format(utcDate(localToUtcIso(date, '12:00')));
}

export function localDateRangeToUtc(from: string, through: string) {
  return {
    from: localToUtcIso(from, '00:00'),
    to: localToUtcIso(addLocalDays(through, 1), '00:00'),
  };
}

export function localDateToUtcRange(date: string) {
  return localDateRangeToUtc(date, date);
}

export function weekRangeUtc(weekStartDate: string) {
  return localDateRangeToUtc(weekStartDate, addLocalDays(weekStartDate, 6));
}

/** PocketBase representa las fechas civiles de pagos como medianoche UTC. */
export function formatCivilDate(value: string): string {
  return formatDate(localToUtcIso(value.slice(0, 10), '12:00'));
}
