import { enableAutoUnmount, mount } from '@vue/test-utils';
import ConfirmationService from 'primevue/confirmationservice';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import { useConfirm } from 'primevue/useconfirm';
import { afterEach, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { useNotify } from '@/composables/useNotify';
import { AppPreset } from '@/lib/theme';
import App from './App.vue';

enableAutoUnmount(afterEach);

it('renders a success toast and a confirmation requested from a routed view', async () => {
  const view = defineComponent({
    setup() {
      const notify = useNotify();
      const confirm = useConfirm();
      return () =>
        h('button', {
          onClick: () => {
            notify.success('Guardado');
            confirm.require({ header: 'Confirmar', message: '¿Continuar?' });
          },
        });
    },
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: view }],
  });
  await router.push('/');
  const wrapper = mount(App, {
    global: {
      plugins: [
        [PrimeVue, { theme: { preset: AppPreset } }],
        ToastService,
        ConfirmationService,
        router,
      ],
    },
  });
  await wrapper.get('button').trigger('click');
  const toast = document.querySelector('[data-position="top-right"]');
  expect(
    toast?.querySelector('.p-toast-message-success')?.textContent,
  ).toContain('Guardado');
  const dialog = document.querySelector('[role="alertdialog"]');
  expect(dialog?.textContent).toContain('Confirmar');
  expect(dialog?.textContent).toContain('¿Continuar?');
});
