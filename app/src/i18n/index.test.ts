import { afterEach, describe, expect, it, vi } from 'vitest';
import { initializeLocale, resolveLocale, setLocale, t, te } from '@/i18n';

afterEach(async () => {
  await setLocale('en');
  localStorage.clear();
  vi.unstubAllGlobals();
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

it('uses a Spanish browser only when there is no preference and persists the choice', async () => {
  vi.stubGlobal('navigator', { language: 'es-MX' });
  localStorage.clear();
  await initializeLocale();
  expect(t('Sign out')).toBe('Cerrar sesión');
  expect(document.documentElement.lang).toBe('es');
  expect(localStorage.getItem('locale')).toBe('es');

  localStorage.setItem('locale', 'en');
  await initializeLocale();
  expect(t('Sign out')).toBe('Sign out');
  expect(document.documentElement.lang).toBe('en');

  localStorage.setItem('locale', 'invalid');
  await initializeLocale();
  expect(localStorage.getItem('locale')).toBe('en');

  vi.stubGlobal('navigator', { language: 'fr' });
  localStorage.clear();
  await initializeLocale();
  expect(document.documentElement.lang).toBe('en');
  expect(localStorage.getItem('locale')).toBe('en');
});
