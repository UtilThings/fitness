import { computed } from 'vue';
import { locale } from '@/i18n';

type IntlLocale = 'en-US' | 'es-US';

export function intlLocale(): IntlLocale {
  return locale.value === 'es' ? 'es-US' : 'en-US';
}

const activeCollator = computed(() => new Intl.Collator(intlLocale()));

export function collator(): Intl.Collator {
  return activeCollator.value;
}
