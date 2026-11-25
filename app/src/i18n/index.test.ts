import { afterEach, describe, expect, it } from 'vitest';
import { initializeLocale, resolveLocale, setLocale, t, te } from '@/i18n';

afterEach(async () => {
  await setLocale('en');
  localStorage.clear();
});

describe('admin locale', () => {
  it('prefers a stored locale and normalizes unsupported preferences', () => {
    expect(resolveLocale('es', 'en-US')).toBe('es');
    expect(resolveLocale('en', 'es-MX')).toBe('en');
    expect(resolveLocale('invalid', 'es-MX')).toBe('en');
    expect(resolveLocale(null, 'es-MX')).toBe('es');
    expect(resolveLocale(null, 'fr')).toBe('en');
    expect(resolveLocale()).toBe('en');
  });

  it('loads the Spanish catalog for a stored preference and uses English keys as fallback', async () => {
    localStorage.setItem('locale', 'es');
    await initializeLocale();
    expect(t('Sign out')).toBe('Cerrar sesión');
    expect(te('Sign out')).toBe(true);

    await setLocale('en');
    expect(t('Sign out')).toBe('Sign out');
    expect(te('Sign out')).toBe(false);
  });

  it('keeps the latest selection when Spanish loads asynchronously', async () => {
    const loading = setLocale('es');
    await setLocale('en');
    await loading;
    expect(t('Sign out')).toBe('Sign out');
    expect(localStorage.getItem('locale')).toBe('en');
  });
});
