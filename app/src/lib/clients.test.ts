import { expect, it } from 'vitest';
import { buildSearchFilter, formatPhone, fullName } from './clients';

it('busca ambos términos en los cuatro campos con parámetros', () => {
  expect(buildSearchFilter(' ana 305 ')).toBe(
    '(first_name ~ "ana" || last_name ~ "ana" || email ~ "ana" || phone ~ "ana") && ' +
      '(first_name ~ "305" || last_name ~ "305" || email ~ "305" || phone ~ "305")',
  );
  expect(buildSearchFilter('   ')).toBe('');
  expect(buildSearchFilter("O'Neil")).toContain(`first_name ~ "O'Neil"`);
});

it('busca el teléfono con y sin formato y conserva el correo parcial', () => {
  expect(buildSearchFilter('(305) 555-01')).toContain('phone ~ "30555501"');
  expect(buildSearchFilter('+1 (305) 555-0100')).toContain(
    'phone ~ "+13055550100"',
  );
  expect(buildSearchFilter('ana@')).toContain('email ~ "ana@"');
});

it('formatea el nombre y el teléfono norteamericano', () => {
  expect(fullName({ first_name: 'Ana', last_name: 'García' })).toBe(
    'Ana García',
  );
  expect(formatPhone('+13055550100')).toBe('(305) 555-0100');
  expect(formatPhone('+573001234567')).toBe('+573001234567');
  expect(formatPhone('')).toBe('');
});
