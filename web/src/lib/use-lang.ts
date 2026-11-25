import { computed, onMounted, ref } from 'vue';
import {
  formatMessage,
  initializeLocale,
  locale,
  resolveLocale,
  setLocale,
  type Locale,
  type MessageKey,
  type Params,
} from '@/i18n';

export function useLang() {
  const mounted = ref(false);
  const lang = computed<Locale>(() =>
    mounted.value ? resolveLocale(locale.value) : 'en',
  );

  function initLang() {
    mounted.value = true;
    return initializeLocale();
  }

  function render(key: string, params?: Params) {
    return formatMessage(key, params, lang.value);
  }

  onMounted(() => {
    void initLang().catch(console.error);
  });

  return {
    lang,
    setLang: async (value: Locale) => {
      try {
        await setLocale(value);
      } catch (error) {
        console.error(error);
      }
    },
    t: render,
    translateKey: (key: MessageKey, params?: Params) => render(key, params),
    initLang,
  };
}
