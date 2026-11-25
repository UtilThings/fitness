import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import { afterEach, expect, it } from 'vitest';
import { nextTick } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { setLocale } from '@/i18n';
import ForgotPasswordView from '@/views/auth/ForgotPasswordView.vue';
import LoginView from '@/views/auth/LoginView.vue';
import { expectEnglishCopy } from './copy';

afterEach(async () => {
  await setLocale('es');
  localStorage.clear();
});

it('renders sign in in English and updates the mounted form in Spanish', async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'login', component: LoginView },
      {
        path: '/forgot-password',
        name: 'forgot-password',
        component: ForgotPasswordView,
      },
    ],
  });
  await router.push('/login');
  await setLocale('en');
  const view = mount(LoginView, { global: { plugins: [PrimeVue, router] } });
  expect(view.get('h1').text()).toBe('Sign in');
  expect(view.get('input[type=email]').attributes('placeholder')).toBe(
    'name@company.com',
  );
  expectEnglishCopy(view.element);

  await setLocale('es');
  await nextTick();
  expect(view.get('h1').text()).toBe('Iniciar sesión');
  expect(view.get('input[type=email]').attributes('placeholder')).toBe(
    'nombre@empresa.com',
  );
  view.unmount();
});

it('detects Spanish copy leaked into English', () => {
  const element = document.createElement('button');
  element.textContent = 'Guardar cambios';
  expect(() => expectEnglishCopy(element)).toThrow(/Guardar cambios/);
});
