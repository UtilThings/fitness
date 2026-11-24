import { expect, it, vi } from 'vitest';
import {
  dictionary,
  LANG_EVENT,
  readStoredLang,
  STORAGE_KEY,
  storeLang,
  translate,
} from './i18n';

it('has the same translation keys in both languages', () => {
  const keys = Object.keys(dictionary.en).sort();
  expect(Object.keys(dictionary.es).sort()).toEqual(keys);
  expect(translate('es', 'book')).toBe('Reserva tu clase');
});

it.each([
  ['es', 'es'],
  ['en', 'en'],
  ['fr', 'en'],
  [null, 'en'],
])('reads %s as %s', (value, lang) => {
  expect(readStoredLang({ getItem: () => value })).toBe(lang);
});

it('stores the active language under jq-lang', () => {
  const setItem = vi.fn();
  storeLang({ setItem }, 'es');
  expect(setItem).toHaveBeenCalledWith(STORAGE_KEY, 'es');
});

it('updates static text in response to language changes', async () => {
  document.body.innerHTML = '<span data-i18n="book">Book your class</span>';
  await import('@/scripts/i18n-client');
  window.dispatchEvent(new CustomEvent(LANG_EVENT, { detail: 'es' }));
  expect(document.querySelector('[data-i18n]')?.textContent).toBe(
    'Reserva tu clase',
  );
});
