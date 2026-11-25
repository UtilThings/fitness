const MAX_SEQUENCE = 999999;
const validPrefix = /^[A-Z0-9]{2,6}$/;

export function formatReceipt(prefix: string, year: number, seq: number): string {
  if (!validPrefix.test(prefix)) throw new RangeError("The receipt prefix is invalid.");
  if (!Number.isInteger(year) || year < 1 || year > 9999 ||
      !Number.isInteger(seq) || seq < 1 || seq > MAX_SEQUENCE) {
    throw new RangeError("The receipt year or sequence is invalid.");
  }
  return `${prefix}-${String(year).padStart(4, "0")}-${String(seq).padStart(6, "0")}`;
}

export function parseReceipt(text: string, prefix: string): { year: number; seq: number } | null {
  if (!validPrefix.test(prefix) || !text.startsWith(prefix + "-")) return null;
  const match = /^(\d{4})-(\d{6})$/.exec(text.slice(prefix.length + 1));
  if (!match || match[0] !== text.slice(prefix.length + 1)) return null;
  const year = Number(match[1]);
  const seq = Number(match[2]);
  return year && seq ? { year, seq } : null;
}

export function isValidReceipt(text: string, prefix: string): boolean {
  return parseReceipt(text, prefix) !== null;
}

export function nextSequence(lastSeq: number): number {
  if (!Number.isInteger(lastSeq) || lastSeq < 0 || lastSeq >= MAX_SEQUENCE) {
    throw new RangeError("The receipt sequence is out of range.");
  }
  return lastSeq + 1;
}

export function localYear(paidAt: string): number {
  const parsed = new Date(paidAt);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidAt) ||
      !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== paidAt ||
      parsed.getUTCFullYear() < 1) {
    throw new RangeError("The payment date is invalid.");
  }
  return parsed.getUTCFullYear();
}
