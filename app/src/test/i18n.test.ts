import { expect, it } from 'vitest';
import { t } from '@/i18n';
import { withLocale } from './i18n';

it('selects either language and restores the preceding preference', async () => {
  await withLocale('en', async () => {
    expect(t('Sign out')).toBe('Sign out');
    await withLocale('es', () => expect(t('Sign out')).toBe('Cerrar sesión'));
    expect(t('Sign out')).toBe('Sign out');
  });
  expect(t('Sign out')).toBe('Cerrar sesión');
  expect(localStorage.getItem('locale')).toBeNull();
});
