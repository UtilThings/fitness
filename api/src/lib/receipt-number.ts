const MAX_SEQUENCE = 999999;

export function formatReceipt(year: number, seq: number): string {
  if (!Number.isInteger(year) || year < 1 || year > 9999 ||
      !Number.isInteger(seq) || seq < 1 || seq > MAX_SEQUENCE) {
    throw new RangeError("Año o secuencia de recibo inválidos");
  }
  return `JQ-${String(year).padStart(4, "0")}-${String(seq).padStart(6, "0")}`;
}

export function parseReceipt(text: string): { year: number; seq: number } | null {
  const match = /^JQ-(\d{4})-(\d{6})$/.exec(text);
  if (!match || match[0] !== text) return null;
  const year = Number(match[1]);
  const seq = Number(match[2]);
  return year && seq ? { year, seq } : null;
}

export function isValidReceipt(text: string): boolean {
  return parseReceipt(text) !== null;
}

export function nextSequence(lastSeq: number): number {
  if (!Number.isInteger(lastSeq) || lastSeq < 0 || lastSeq >= MAX_SEQUENCE) {
    throw new RangeError("Secuencia de recibos fuera de rango");
  }
  return lastSeq + 1;
}

export function localYear(paidAt: string): number {
  const parsed = new Date(paidAt);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidAt) ||
      !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== paidAt ||
      parsed.getUTCFullYear() < 1) {
    throw new RangeError("Fecha de pago inválida");
  }
  return parsed.getUTCFullYear();
}
