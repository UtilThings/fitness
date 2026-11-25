import { i18n, locale, setLocale, type Locale } from '@/i18n';

export const i18nPlugin = i18n;

export async function withLocale<T>(
  value: Locale,
  callback: () => T | Promise<T>,
): Promise<T> {
  const previous = locale.value;
  const preference = localStorage.getItem('locale');
  try {
    await setLocale(value);
    return await callback();
  } finally {
    await setLocale(previous === 'es' ? 'es' : 'en');
    if (preference === null) localStorage.removeItem('locale');
    else localStorage.setItem('locale', preference);
  }
}
