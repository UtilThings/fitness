import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('web locale', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    await (await import('./index')).setLocale('en');
    localStorage.clear();
    document.documentElement.lang = 'en';
  });

  it('imports safely without a browser and compiles English fallback messages', async () => {
    vi.stubGlobal('window', undefined);
    const { initializeLocale, i18n, t } = await import('./index');
    await initializeLocale();
    expect(i18n.global.availableLocales).not.toContain('es');
    expect(t('Hello {name}.', { name: 'Ada' })).toBe('Hello Ada.');
  });

  it('resolves supported locale variants and defaults to English', async () => {
    const { resolveLocale } = await import('./index');
    expect(resolveLocale('ES-mx')).toBe('es');
    expect(resolveLocale('fr')).toBe('en');
    expect(resolveLocale()).toBe('en');
  });

  it('uses the stored preference before the browser language', async () => {
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('es-MX');
    localStorage.setItem('jq-lang', 'en');
    const { initializeLocale, locale } = await import('./index');
    await initializeLocale();
    expect(locale.value).toBe('en');
  });

  it('loads Spanish only when needed and persists only explicit changes', async () => {
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('es-MX');
    const { initializeLocale, setLocale, i18n, t } = await import('./index');
    expect(t('Book your class')).toBe('Book your class');
    expect(i18n.global.availableLocales).not.toContain('es');
    await initializeLocale();
    expect(t('Book your class')).toBe('Reserva tu clase');
    expect(t('Unknown message')).toBe('Unknown message');
    expect(localStorage.getItem('jq-lang')).toBeNull();
    await setLocale('en');
    expect(localStorage.getItem('jq-lang')).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('continues working with storage blocked', async () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    const { initializeLocale, setLocale, t } = await import('./index');
    await expect(initializeLocale()).resolves.toBeUndefined();
    await setLocale('es');
    expect(t('Book your class')).toBe('Reserva tu clase');
  });

  it('keeps the latest choice while Spanish loads', async () => {
    const { setLocale, locale } = await import('./index');
    await Promise.all([setLocale('es'), setLocale('en')]);
    expect(locale.value).toBe('en');
    expect(localStorage.getItem('jq-lang')).toBe('en');
  });
});
