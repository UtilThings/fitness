import { afterEach, expect, it, vi } from 'vitest';
import { setLocale } from '@/i18n';
import { applyLanguage } from './i18n-client';

afterEach(async () => {
  vi.restoreAllMocks();
  await setLocale('en');
  localStorage.clear();
  document.body.replaceChildren();
  document.title = '';
});

it('translates text, title and attributes on language events and restores English', async () => {
  document.body.innerHTML = `<span data-i18n="Book your class">Book your class</span>
    <input placeholder="Contact" data-i18n-placeholder="Contact" />
    <span data-i18n="Unknown">Original text</span>`;
  document.title = 'Pricing';
  document.querySelector('title')?.setAttribute('data-i18n', 'Pricing');

  await setLocale('es');
  expect(document.documentElement.lang).toBe('es');
  expect(document.title).toBe('Precios');
  expect(document.querySelector('span')?.textContent).toBe('Reserva tu clase');
  expect(document.querySelector('input')?.placeholder).toBe('Contacto');
  expect(document.querySelector('[data-i18n="Unknown"]')?.textContent).toBe(
    'Original text',
  );

  await setLocale('en');
  expect(document.documentElement.lang).toBe('en');
  expect(document.title).toBe('Pricing');
  expect(document.querySelector('span')?.textContent).toBe('Book your class');
  expect(document.querySelector('input')?.placeholder).toBe('Contact');
});

it('renders parameters as text and safely ignores malformed JSON', async () => {
  const { i18n } = await import('@/i18n');
  await setLocale('es');
  i18n.global.mergeLocaleMessage('es', {
    'Hello {name}': 'Hola {name}',
  });
  document.body.innerHTML = `<span data-i18n="Hello {name}">Hello visitor</span>
    <span data-i18n="Contact" data-i18n-params="{broken">Contact</span>`;
  document
    .querySelector('span')
    ?.setAttribute('data-i18n-params', JSON.stringify({ name: '<b>JQ</b>' }));

  applyLanguage();
  expect(document.querySelector('span')?.textContent).toBe('Hola <b>JQ</b>');
  expect(document.querySelector('b')).toBeNull();
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
  await setLocale('es');
  expect(storage).toHaveBeenCalled();
  expect(document.documentElement.lang).toBe('es');
  expect(document.querySelector('span')?.textContent).toBe('Contacto');
});
