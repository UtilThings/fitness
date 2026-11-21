import { expect, it } from 'vitest';
import { generatePassword, validatePassword } from './password';

it('genera contraseñas sin caracteres ambiguos', () => {
  const password = generatePassword();
  expect(password).toHaveLength(12);
  expect(password).not.toMatch(/[0O1lI]/);
  expect(validatePassword(password)).toBeNull();
  expect(generatePassword(16)).toHaveLength(16);
  expect(validatePassword('1234567')).toBe('Usa al menos 8 caracteres');
  expect(validatePassword('12345678')).toBeNull();
});
