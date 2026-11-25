import { beforeEach } from 'vitest';
import { i18n, locale } from '@/i18n';
import spanish from '@/i18n/locales/es.json';

i18n.global.setLocaleMessage('es', spanish);

// Existing suites assert Spanish copy. Language-specific tests select their locale explicitly.
locale.value = 'es';
beforeEach(() => {
  localStorage.clear();
  locale.value = 'es';
});
