import { expect, it } from 'vitest';
import { centsToDecimal, formatUsd, parseUsdToCents } from './money';

it.each([
  [0, '0.00', '$0.00'],
  [1, '0.01', '$0.01'],
  [99, '0.99', '$0.99'],
  [100, '1.00', '$1.00'],
  [123456, '1234.56', '$1,234.56'],
  [Number.MAX_SAFE_INTEGER, '90071992547409.91', '$90,071,992,547,409.91'],
])('represents %i cents exactly', (cents, decimal, currency) => {
  expect(centsToDecimal(cents)).toBe(decimal);
  expect(formatUsd(cents)).toBe(currency);
  expect(parseUsdToCents(currency)).toBe(cents);
});

it('accepts padding, whole dollars and one decimal place', () => {
  expect(parseUsdToCents('  $ 1,234.5  ')).toBe(123450);
  expect(parseUsdToCents('12')).toBe(1200);
});

it.each(['', '$', '1.234', '-1.00', '1,23', '1 2', '1e2', '90071992547409.92'])(
  'rejects %j',
  (input) => {
    expect(parseUsdToCents(input)).toBeNull();
  },
);
