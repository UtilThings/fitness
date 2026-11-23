import { enableAutoUnmount, mount } from '@vue/test-utils';
import ConfirmationService from 'primevue/confirmationservice';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import { useConfirm } from 'primevue/useconfirm';
import { afterEach, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { useNotify } from '@/composables/useNotify';
import { pb } from '@/lib/pocketbase';
import { AppPreset } from '@/lib/theme';
import appRouter, { installGuard } from '@/router';
import type { Role } from '@/types/pb';
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

it('renders the role-filtered admin menu and the restricted-route fallback', async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      ...appRouter.options.routes,
      {
        path: '/owner-only',
        component: { render: () => h('h1', 'Acceso de owner') },
        meta: { roles: ['owner'] },
      },
    ],
  });
  installGuard(router);

  function signInAs(role: Role) {
    const claims = btoa(
      JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }),
    );
    pb.authStore.save(`test.${claims}.test`, {
      id: 'test-admin',
      collectionId: 'admins',
      collectionName: 'admins',
      email: 'admin@example.test',
      role,
      active: true,
    });
  }

  try {
    signInAs('owner');
    await router.push('/');
    const wrapper = mount(App, {
      global: {
        plugins: [PrimeVue, ToastService, ConfirmationService, router],
      },
    });
    const sidebar = wrapper.get('#admin-sidebar');
    expect(
      sidebar
        .findAll('[data-pc-name="sidebargrouplabel"]')
        .map((item) => item.text()),
    ).toEqual([
      'Análisis',
      'Operaciones',
      'Catálogo',
      'Ajustes',
      'Facturación',
    ]);
    expect(sidebar.get('a[href="/"]').text()).toBe('Dashboard');
    const disabledItems = sidebar
      .findAll('button[disabled]')
      .map((item) => item.text());
    expect(disabledItems).not.toContain('Pagos');
    expect(sidebar.find('a[href="/payments"]').exists()).toBe(true);
    expect(disabledItems).not.toContain('Clientes');
    expect(sidebar.find('a[href="/clients"]').exists()).toBe(true);
    expect(sidebar.text()).not.toContain('Rutinas');
    expect(sidebar.get('a[href="/memberships"]').text()).toBe('Suscripciones');
    await sidebar.get('button[aria-controls="user-menu"]').trigger('click');
    const menu = document.getElementById('user-menu');
    expect(menu?.textContent).toContain('Cerrar sesión');
    expect(menu?.textContent).not.toContain('Notificaciones');

    await router.push('/owner-only');
    expect(wrapper.get('h1').text()).toBe('Acceso de owner');

    signInAs('coach');
    await router.push('/');
    expect(wrapper.get('#admin-sidebar').text()).not.toContain('Pagos');
    await router.push('/owner-only');
    expect(router.currentRoute.value.path).toBe('/forbidden');
    expect(wrapper.find('#admin-sidebar').exists()).toBe(true);
    expect(wrapper.get('h1').text()).toBe(
      'No tienes permiso para ver esta página',
    );
    expect(wrapper.get('section a').attributes('href')).toBe('/');
  } finally {
    pb.authStore.clear();
  }
});
