export const BUSINESS_TZ = 'America/New_York';

const HOUR_MS = 3_600_000;
const displayDate = { dateStyle: 'medium' } as const;
const displayTime = { timeStyle: 'short', hour12: true } as const;

function businessFormatter(options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('es-US', {
    timeZone: BUSINESS_TZ,
    ...options,
  });
}

const dateFormatter = businessFormatter(displayDate);
const timeFormatter = businessFormatter(displayTime);
const dateTimeFormatter = businessFormatter({ ...displayDate, ...displayTime });
const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: BUSINESS_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function utcDate(iso: string): Date {
  return new Date(iso.replace(' ', 'T'));
}

export function formatDate(iso: string): string {
  return dateFormatter.format(utcDate(iso));
}

export function formatTime(iso: string): string {
  return timeFormatter.format(utcDate(iso));
}

export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(utcDate(iso));
}

function localParts(instant: Date | number) {
  const parts = Object.fromEntries(
    partsFormatter
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
  const { date, time } = localParts(utcDate(iso));
  return { date, time, weekday: new Date(`${date}T00:00:00Z`).getUTCDay() };
}

function offsetAt(instant: number): number {
  const { date, time, second } = localParts(instant);
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
  const first = localParts(before);
  const second = localParts(after);
  const instant =
    first.date === date && first.time === time
      ? before
      : second.date === date && second.time === time
        ? after
        : before;
  return new Date(instant).toISOString();
}

export function todayLocal(): string {
  return localParts(new Date()).date;
}
