import { mount } from '@vue/test-utils';
import PrimeVue, { usePrimeVue } from 'primevue/config';
import DatePicker from 'primevue/datepicker';
import { defineComponent, h, nextTick } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { expect, it } from 'vitest';
import { setLocale } from '@/i18n';
import { usePrimeVueLocale } from '@/i18n/primevue';
import AuthLayout from '@/layouts/AuthLayout.vue';

it('switches the login language and updates document and PrimeVue labels', async () => {
  await setLocale('en');
  const page = defineComponent({
    setup() {
      usePrimeVueLocale();
      const { config } = usePrimeVue();
      return () => [
        h(DatePicker, { inline: true, modelValue: new Date(2026, 0, 1) }),
        h('span', { 'data-test': 'accept' }, config.locale?.accept),
      ];
    },
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: page, meta: { title: 'Language' } }],
  });
  await router.push('/');
  const wrapper = mount(AuthLayout, {
    global: { plugins: [PrimeVue, router] },
  });

  expect(wrapper.text()).toContain('January');
  expect(wrapper.get('[data-test="accept"]').text()).toBe('Yes');
  expect(document.title).toBe('Language · Admin');

  const select = (label: string) =>
    wrapper
      .findAll('button')
      .find((button) => button.text() === label)!
      .trigger('click');
  await select('Español');
  await nextTick();
  expect(document.documentElement.lang).toBe('es');
  expect(localStorage.getItem('locale')).toBe('es');
  expect(document.title).toBe('Idioma · Admin');
  expect(wrapper.text()).toContain('enero');
  expect(wrapper.get('[data-test="accept"]').text()).toBe('Sí');

  await select('English');
  expect(wrapper.text()).toContain('January');
  expect(wrapper.get('[data-test="accept"]').text()).toBe('Yes');
  expect(document.documentElement.lang).toBe('en');
  wrapper.unmount();
});
