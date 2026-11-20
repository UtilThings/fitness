import { onMounted, onUnmounted, readonly, ref } from 'vue';
import {
  isLang,
  LANG_EVENT,
  readStoredLang,
  storeLang,
  translate,
  type Key,
  type Lang,
} from './i18n';

const lang = ref<Lang>('en');

function syncLang(event: Event) {
  const value: unknown = (event as CustomEvent<unknown>).detail;
  if (isLang(value)) lang.value = value;
}

export function useLang() {
  function initLang() {
    lang.value = readStoredLang({
      getItem: (key) => window.localStorage.getItem(key),
    });
  }

  function setLang(value: Lang) {
    lang.value = value;
    storeLang(
      { setItem: (key, item) => window.localStorage.setItem(key, item) },
      value,
    );
    window.dispatchEvent(new CustomEvent(LANG_EVENT, { detail: value }));
  }

  const listener = (event: Event) => syncLang(event);
  onMounted(() => {
    initLang();
    window.addEventListener(LANG_EVENT, listener);
  });
  onUnmounted(() => window.removeEventListener(LANG_EVENT, listener));

  return {
    lang: readonly(lang),
    setLang,
    t: (key: Key) => translate(lang.value, key),
    initLang,
  };
}
