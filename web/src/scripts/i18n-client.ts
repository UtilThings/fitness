import {
  dictionary,
  isLang,
  LANG_EVENT,
  readStoredLang,
  translate,
  type Key,
  type Lang,
} from '@/lib/i18n';

function applyLanguage(lang: Lang) {
  for (const element of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const key = element.dataset.i18n;
    if (key && Object.hasOwn(dictionary.en, key)) {
      element.textContent = translate(lang, key as Key);
    }
  }
}

applyLanguage(
  readStoredLang({ getItem: (key) => window.localStorage.getItem(key) }),
);

window.addEventListener(LANG_EVENT, (event) => {
  const lang: unknown = (event as CustomEvent<unknown>).detail;
  if (isLang(lang)) applyLanguage(lang);
});
