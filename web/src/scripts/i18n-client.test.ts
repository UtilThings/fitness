import { afterEach, expect, it, vi } from 'vitest';
import { resetLocaleAfterEach, useLocale } from '@/test/i18n';
import { applyLanguage } from './i18n-client';

resetLocaleAfterEach();

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
  document.title = '';
});

it('translates text, title and attributes on language events and restores English', async () => {
  document.body.innerHTML = `<span data-i18n="Book your class">Book your class</span>
    <input placeholder="Contact" data-i18n-placeholder="Contact" />
    <span data-i18n="Unknown">Original text</span>`;
  document.title = 'Pricing';
  document.querySelector('title')?.setAttribute('data-i18n', 'Pricing');

  await useLocale('es');
  expect(document.documentElement.lang).toBe('es');
  expect(document.title).toBe('Precios');
  expect(document.querySelector('span')?.textContent).toBe('Reserva tu clase');
  expect(document.querySelector('input')?.placeholder).toBe('Contacto');
  expect(document.querySelector('[data-i18n="Unknown"]')?.textContent).toBe(
    'Original text',
  );

  await useLocale('en');
  expect(document.documentElement.lang).toBe('en');
  expect(document.title).toBe('Pricing');
  expect(document.querySelector('span')?.textContent).toBe('Book your class');
  expect(document.querySelector('input')?.placeholder).toBe('Contact');
});

it('renders parameters as text and safely ignores malformed JSON', async () => {
  await useLocale('es');
  document.body.innerHTML = `<span data-i18n="{name} logo">Logo</span>
    <img alt="Logo" data-i18n-alt="{name} logo" title="Pricing" data-i18n-title="Pricing" />
    <span data-i18n="Contact" data-i18n-params="{broken">Contact</span>
    <span data-i18n="Menu" data-i18n-params='[["unexpected"]]'>Menu</span>`;
  const params = JSON.stringify({ name: '<b>JQ</b>' });
  document.querySelector('span')?.setAttribute('data-i18n-params', params);
  document.querySelector('img')?.setAttribute('data-i18n-params-alt', params);

  applyLanguage();
  expect(document.querySelector('span')?.textContent).toBe('Logo de <b>JQ</b>');
  expect(document.querySelector('b')).toBeNull();
  expect(document.querySelector('img')?.alt).toBe('Logo de <b>JQ</b>');
  expect(document.querySelector('img')?.title).toBe('Precios');
  expect(document.querySelector('[data-i18n="Menu"]')?.textContent).toBe(
    'Menú',
  );
  expect(document.querySelector('[data-i18n="Contact"]')?.textContent).toBe(
    'Contacto',
  );
});

it('keeps updating the page when the browser blocks localStorage', async () => {
  document.body.innerHTML = '<span data-i18n="Contact">Contact</span>';
  const storage = vi
    .spyOn(window, 'localStorage', 'get')
    .mockImplementation(() => {
      throw new Error('Blocked');
    });
  await useLocale('es');
  expect(storage).toHaveBeenCalled();
  expect(document.documentElement.lang).toBe('es');
  expect(document.querySelector('span')?.textContent).toBe('Contacto');
});

it('updates a program time in both directions while preserving its canonical value', async () => {
  document.body.innerHTML =
    '<time datetime="19:30" data-local-time>7:30 PM</time>';
  const time = document.querySelector('time')!;
  await useLocale('es');
  expect(time.textContent).toBe('19:30');
  await useLocale('en');
  expect(time.textContent).toBe('7:30 PM');
  expect(time.dateTime).toBe('19:30');
});
