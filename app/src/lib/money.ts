import { businessCurrency } from './business-session';

const formatters = new Map<string, Intl.NumberFormat>();
function moneyFormatter(currency: string) {
  let formatter = formatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    formatters.set(currency, formatter);
  }
  return formatter;
}
const maxCents = BigInt(Number.MAX_SAFE_INTEGER);

function splitCents(cents: number) {
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError('Se espera un número entero seguro de centavos');
  }

  const amount = BigInt(Math.abs(cents));
  return {
    dollars: amount / 100n,
    fraction: String(amount % 100n).padStart(2, '0'),
  };
}

export function formatMoney(
  cents: number,
  currency = businessCurrency.value,
): string {
  const { dollars, fraction } = splitCents(cents);
  const value = cents < 0 ? (dollars === 0n ? -0 : -dollars) : dollars;
  return moneyFormatter(currency)
    .formatToParts(value)
    .map((part) => (part.type === 'fraction' ? fraction : part.value))
    .join('');
}

export function centsToDecimal(cents: number): string {
  const { dollars, fraction } = splitCents(cents);
  return `${cents < 0 ? '-' : ''}${dollars}.${fraction}`;
}

export function parseUsdToCents(text: string): number | null {
  const match = /^\s*\$?\s*(\d+|\d{1,3}(?:,\d{3})+)(?:\.(\d{1,2}))?\s*$/.exec(
    text,
  );
  if (!match) return null;

  const dollars = BigInt(match[1].replaceAll(',', ''));
  const fraction = BigInt((match[2] ?? '').padEnd(2, '0'));
  const cents = dollars * 100n + fraction;
  return cents <= maxCents ? Number(cents) : null;
}

export const formatCents = formatMoney;
export const formatUsd = (cents: number) => formatMoney(cents, 'USD');

export function parseToCents(text: string): number | null {
  let amount = text.trim().replace(/^\$\s*/, '');
  if (amount.includes(',') && amount.includes('.')) {
    if (/^\d{1,3}(?:,\d{3})+\.\d+$/.test(amount)) {
      amount = amount.replaceAll(',', '');
    } else if (/^\d{1,3}(?:\.\d{3})+,\d+$/.test(amount)) {
      amount = amount.replaceAll('.', '');
    } else {
      return null;
    }
  }

  const match = /^(\d+)(?:[.,](\d+))?$/.exec(amount);
  if (!match) return null;
  const fraction = (match[2] ?? '').padEnd(3, '0');
  const rounded = fraction[2] >= '5' ? 1n : 0n;
  const cents =
    BigInt(match[1]) * 100n + BigInt(fraction.slice(0, 2)) + rounded;
  return cents <= maxCents ? Number(cents) : null;
}
