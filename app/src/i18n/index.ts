import { createI18n } from 'vue-i18n';

export const supportedLocales = ['en', 'es'] as const;
export type Locale = (typeof supportedLocales)[number];

const localeKey = 'locale';

export function resolveLocale(
  preference?: string | null,
  browserLanguage?: string,
): Locale {
  if (preference != null) return preference === 'es' ? 'es' : 'en';
  return browserLanguage?.toLowerCase().split('-')[0] === 'es' ? 'es' : 'en';
}

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  fallbackFormat: true,
  missingWarn: false,
  fallbackWarn: false,
});

export const { locale, t, te } = i18n.global;

export function translateMessage(message: string): string {
  return te(message) ? t(message) : message;
}

export function translateKey(key: string): string {
  return t(key);
}

export function tl<Key extends string>(key: Key): Key {
  return key;
}

let spanishMessages: Promise<Record<string, string>> | undefined;
let latestRequest = 0;

export async function setLocale(value: Locale): Promise<void> {
  const request = ++latestRequest;
  if (value === 'es' && !i18n.global.availableLocales.includes('es')) {
    spanishMessages ??= import('./locales/es.json')
      .then(({ default: messages }) => messages)
      .catch((error: unknown) => {
        spanishMessages = undefined;
        throw error;
      });
    const messages = await spanishMessages;
    i18n.global.setLocaleMessage('es', messages);
  }
  if (request !== latestRequest) return;
  locale.value = value;
  if (typeof document !== 'undefined') document.documentElement.lang = value;
  try {
    globalThis.localStorage?.setItem(localeKey, value);
  } catch {
    // The current session still works when storage is blocked.
  }
}

export async function initializeLocale(): Promise<void> {
  let preference: string | null | undefined;
  try {
    preference = globalThis.localStorage?.getItem(localeKey);
  } catch {
    // Storage can be unavailable in a restricted browser context.
  }
  await setLocale(resolveLocale(preference, globalThis.navigator?.language));
}
