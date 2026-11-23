import { centsToDecimal } from './money';

export type CsvColumn = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'money';
};

function cell(value: unknown, type: CsvColumn['type'] = 'text'): string {
  if (value == null) return '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (type === 'number') return String(value);
    if (type === 'money' && Number.isSafeInteger(value)) {
      return centsToDecimal(value);
    }
  }

  const text = String(value);
  const safe = /^(?:[\t\r\n]|\s*[=+@-])/u.test(text) ? "'" + text : text;
  return /[,"\r\n]/.test(safe) ? '"' + safe.replaceAll('"', '""') + '"' : safe;
}

export function toCsv(
  columns: readonly CsvColumn[],
  rows: readonly Record<string, unknown>[],
): string {
  const header = columns.map(({ label }) => cell(label)).join(',');
  const body = rows.map((row) =>
    columns.map(({ key, type }) => cell(row[key], type)).join(','),
  );
  return '\uFEFF' + [header, ...body].join('\r\n');
}

export function csvFilename(kind: string, from: string, to: string): string {
  const safe = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return `jq-reportes-${safe(kind)}-${safe(from)}_${safe(to)}.csv`;
}

export function downloadCsv(filename: string, csv: string): void {
  const url = URL.createObjectURL(
    new Blob([csv], { type: 'text/csv;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
