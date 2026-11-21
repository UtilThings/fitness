const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});
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

export function formatUsd(cents: number): string {
  const { dollars, fraction } = splitCents(cents);
  const value = cents < 0 ? (dollars === 0n ? -0 : -dollars) : dollars;
  return usd
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
