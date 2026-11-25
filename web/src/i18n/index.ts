import { createI18n } from 'vue-i18n';

export const supportedLocales = ['en', 'es'] as const;
export type Locale = (typeof supportedLocales)[number];
export const STORAGE_KEY = 'jq-lang';
export const LANG_EVENT = 'jq-lang-change';

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  fallbackFormat: true,
  missingWarn: false,
  fallbackWarn: false,
});

export const { locale, t } = i18n.global;

declare const markedKey: unique symbol;
export type MessageKey = string & { readonly [markedKey]: true };
export type Params = Record<string, string | number>;
export interface Message {
  key: MessageKey;
  params?: Params;
}

export type Text = string | Message;

export function resolveText(
  text: Text,
  translate: (key: MessageKey, params?: Params) => string,
): string {
  return typeof text === 'string' ? text : translate(text.key, text.params);
}

export function tl<Key extends string>(key: Key): Key & MessageKey {
  return key as Key & MessageKey;
}

const compose = i18n.global.t;

export function formatMessage(
  key: string,
  params: Params = {},
  language: Locale = resolveLocale(locale.value),
): string {
  return compose(key, params, { locale: language });
}

export function resolveLocale(value?: string | null): Locale {
  return value?.toLowerCase().split('-')[0] === 'es' ? 'es' : 'en';
}

let spanishMessages: Promise<void> | undefined;
let initialization: Promise<void> | undefined;
let latestRequest = 0;

async function applyLocale(value: Locale, persist: boolean): Promise<void> {
  if (typeof window === 'undefined') return;
  const request = ++latestRequest;
  if (value === 'es') {
    spanishMessages ??= import('./locales/es.json')
      .then(({ default: messages }) =>
        i18n.global.setLocaleMessage('es', messages),
      )
      .catch((error: unknown) => {
        spanishMessages = undefined;
        throw error;
      });
    await spanishMessages;
  }
  if (request !== latestRequest) return;

  locale.value = value;
  window.document.documentElement.lang = value;
  if (persist) {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // The session still works when the browser blocks storage.
    }
  }
  window.dispatchEvent(new CustomEvent(LANG_EVENT, { detail: value }));
}

export function setLocale(value: Locale): Promise<void> {
  return applyLocale(value, true);
}

export function initializeLocale(): Promise<void> {
  if (typeof window === 'undefined' || (latestRequest && !initialization)) {
    return Promise.resolve();
  }
  if (initialization) return initialization;

  let preference: string | null = null;
  try {
    preference = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Use the browser language when storage is unavailable.
  }

  initialization = applyLocale(
    resolveLocale(preference ?? window.navigator.language),
    false,
  ).catch((error: unknown) => {
    initialization = undefined;
    // Resolve the site in English when the lazy chunk is unavailable.
    if (latestRequest === 1) latestRequest = 0;
    throw error;
  });
  return initialization;
}
