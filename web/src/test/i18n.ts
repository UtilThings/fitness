import { afterEach } from 'vitest';
import { setLocale } from '@/i18n';

export const useLocale = setLocale;

export function resetLocaleAfterEach() {
  afterEach(async () => {
    await setLocale('en');
    localStorage.clear();
  });
}
