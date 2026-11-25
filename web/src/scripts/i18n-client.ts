import {
  formatMessage,
  i18n,
  initializeLocale,
  LANG_EVENT,
  locale,
  type Params,
} from '@/i18n';
import { translatableAttributes } from '@/i18n/attrs';

const originals = new WeakMap<Element, Map<string, string>>();
const targets = ['', ...translatableAttributes] as const;

function readParams(raw: string | null): Params | undefined {
  if (!raw) return;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.values(value).every(
        (entry) => typeof entry === 'string' || typeof entry === 'number',
      )
    ) {
      return value as Params;
    }
  } catch {
    // An invalid parameter payload should not break the page.
  }
}

export function applyLanguage(root: Document = document) {
  const catalog = i18n.global.getLocaleMessage('es');
  for (const target of targets) {
    const suffix = target ? `-${target}` : '';
    const marker = `data-i18n${suffix}`;
    for (const element of root.querySelectorAll(`[${marker}]`)) {
      const key = element.getAttribute(marker);
      if (!key || !Object.hasOwn(catalog, key)) continue;

      const original = target
        ? element.getAttribute(target)
        : element.textContent;
      if (original === null) continue;
      let values = originals.get(element);
      if (!values) {
        values = new Map();
        originals.set(element, values);
      }
      if (!values.has(target)) values.set(target, original);

      const value =
        locale.value === 'es'
          ? formatMessage(
              key,
              readParams(element.getAttribute(`data-i18n-params${suffix}`)),
              'es',
            )
          : (values.get(target) ?? original);
      if (target) element.setAttribute(target, value);
      else element.textContent = value;
    }
  }
  root.documentElement.lang = locale.value;
}

if (typeof window !== 'undefined') {
  window.addEventListener(LANG_EVENT, () => applyLanguage());
  void initializeLocale()
    .then(() => applyLanguage())
    .catch(console.error);
}
