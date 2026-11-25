import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, expect, it, vi } from 'vitest';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { LANG_EVENT, setLocale, STORAGE_KEY } from '@/i18n';
import Header from './Header.vue';

const props = { currentPath: '/pricing', logoSrc: '/logo.png' };

afterEach(async () => {
  await setLocale('en');
  localStorage.clear();
});

it('highlights only the current route', () => {
  const wrapper = mount(Header, { props });
  expect(
    wrapper.findAll('nav a.text-primary').map((link) => link.text()),
  ).toEqual(['Pricing']);
  wrapper.unmount();
});

it('toggles the eight mobile links and closes on selection', async () => {
  const wrapper = mount(Header, { props });
  const menu = wrapper.get('button[aria-label="Menu"]');
  expect(wrapper.find('#mobile-menu').exists()).toBe(false);
  await menu.trigger('click');
  expect(wrapper.findAll('#mobile-menu a')).toHaveLength(8);
  await menu.trigger('click');
  expect(wrapper.find('#mobile-menu').exists()).toBe(false);
  await menu.trigger('click');
  await wrapper.get('#mobile-menu a[href="/pricing"]').trigger('click');
  expect(wrapper.find('#mobile-menu').exists()).toBe(false);
  wrapper.unmount();
});

it('translates, dispatches the event and restores the stored language', async () => {
  const wrapper = mount(Header, { props });
  const change = vi.fn();
  const changed = new Promise<void>((resolve) => {
    window.addEventListener(
      LANG_EVENT,
      (event) => {
        change(event);
        resolve();
      },
      { once: true },
    );
  });
  await wrapper.get('button:nth-child(2)').trigger('click');
  await changed;
  await flushPromises();
  expect(wrapper.get('nav a[href="/schedule"]').text()).toBe('Horario');
  expect(localStorage.getItem(STORAGE_KEY)).toBe('es');
  expect(change.mock.calls[0][0].detail).toBe('es');
  wrapper.unmount();

  const restored = mount(Header, { props });
  await restored.vm.$nextTick();
  expect(restored.get('nav a[href="/schedule"]').text()).toBe('Horario');
  restored.unmount();
});

it('renders the logo, links and language choices during SSR', async () => {
  const html = await renderToString(createSSRApp(Header, props));
  const host = document.createElement('div');
  host.innerHTML = html;
  expect(host.querySelector('img')?.getAttribute('src')).toBe(props.logoSrc);
  expect(host.querySelectorAll('nav a')).toHaveLength(8);
  expect(
    Array.from(
      host.querySelectorAll('button[aria-pressed]'),
      (button) => button.textContent,
    ),
  ).toEqual(['en', 'es']);
});
