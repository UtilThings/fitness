import { flushPromises, mount } from '@vue/test-utils';
import { ClientResponseError } from 'pocketbase';
import PrimeVue from 'primevue/config';
import Select from 'primevue/select';
import { beforeEach, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import type { Client } from '@/lib/clients';
import ClientsView from './ClientsView.vue';

const mocks = vi.hoisted(() => ({
  getList: vi.fn(),
  getFullList: vi.fn(),
  create: vi.fn(),
}));
vi.mock('@/lib/pocketbase', async () => {
  const { default: PocketBase } = await import('pocketbase');
  const client = new PocketBase('http://localhost');
  return {
    pb: { collection: () => mocks, filter: client.filter.bind(client) },
  };
});

const ana: Client = {
  id: 'ana',
  collectionName: 'clients',
  collectionId: 'clients',
  first_name: 'Ana',
  last_name: 'García',
  email: 'ana@example.test',
  phone: '+13055550100',
  status: 'active',
  goals: '',
  notes: '',
  assessment: null,
  free_class_used: false,
  joined_on: '',
  emergency_contact: '',
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getList.mockResolvedValue({ items: [ana], totalItems: 1 });
  mocks.getFullList.mockResolvedValue([{ id: 'pack', name: 'Plan de prueba' }]);
});

async function view(url = '/clients') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/clients', name: 'clients', component: ClientsView },
      {
        path: '/clients/:id',
        name: 'client-detail',
        component: { template: '<div />' },
      },
    ],
  });
  await router.push(url);
  const wrapper = mount(ClientsView, {
    global: { plugins: [router, PrimeVue], stubs: { teleport: true } },
  });
  await flushPromises();
  return { router, wrapper };
}

it('sincroniza búsqueda y estado, filtra en el servidor y muestra el estado vacío', async () => {
  const { router, wrapper } = await view('/clients?q=ana');
  expect(
    wrapper.get<HTMLInputElement>('input[type=search]').element.value,
  ).toBe('ana');
  expect(wrapper.get('tbody').text()).toContain('Ana García');
  expect(mocks.getList.mock.lastCall?.[2].filter).toMatch(
    /"ana".*status = "active"/,
  );

  mocks.getList.mockResolvedValueOnce({ items: [], totalItems: 0 });
  const filter = wrapper.getComponent(Select);
  filter.vm.$emit('update:modelValue', 'paused');
  await flushPromises();
  expect(router.currentRoute.value.query).toEqual({
    q: 'ana',
    status: 'paused',
  });
  expect(mocks.getList.mock.lastCall?.[2].filter).toMatch(
    /"ana".*status = "paused"/,
  );
  expect(wrapper.text()).toContain('No hay clientes para mostrar');

  await wrapper.get('input[type=search]').setValue('(305) 555-01');
  await vi.waitFor(() =>
    expect(router.currentRoute.value.query.q).toBe('(305) 555-01'),
  );
  expect(mocks.getList.mock.lastCall?.[2].filter).toMatch(
    /phone ~ "30555501".*status = "paused"/,
  );
  wrapper.unmount();
});

it('muestra errores de alta y abre el perfil al guardar', async () => {
  const { router, wrapper } = await view();
  mocks.create
    .mockRejectedValueOnce(
      new ClientResponseError({
        status: 400,
        response: {
          data: {
            email: { code: 'validation_not_unique', message: 'Duplicate' },
            phone: { message: 'Teléfono inválido' },
          },
        },
      }),
    )
    .mockResolvedValueOnce(ana);
  await wrapper.get('button').trigger('click');
  await wrapper.get('input[id$="-first_name"]').setValue('Ana');
  await wrapper.get('input[id$="-last_name"]').setValue('García');
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(wrapper.text()).toContain(
    'Ya existe un cliente con ese correo electrónico.',
  );
  expect(wrapper.text()).toContain('Teléfono inválido');
  expect(router.currentRoute.value.path).toBe('/clients');
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(mocks.create).toHaveBeenLastCalledWith(
    expect.objectContaining({ first_name: 'Ana' }),
    { requestKey: null },
  );
  expect(router.currentRoute.value.path).toBe('/clients/ana');
  wrapper.unmount();
});

it('aplica el plan activo y permite consultar clientes sin membresía activa', async () => {
  const { router, wrapper } = await view('/clients?status=all');
  const [, plan, membership] = wrapper.findAllComponents(Select);
  expect(plan.props('options')).toContainEqual({
    id: 'pack',
    label: 'Plan de prueba',
  });
  plan.vm.$emit('update:modelValue', 'pack');
  await flushPromises();
  expect(router.currentRoute.value.query).toEqual({
    status: 'all',
    plan: 'pack',
  });
  expect(mocks.getList.mock.lastCall?.[2]).toMatchObject({
    expand: 'memberships_via_client.plan.service',
    filter: `memberships_via_client.plan ?= "pack" && memberships_via_client.status ?= 'active'`,
  });
  membership.vm.$emit('update:modelValue', 'without');
  await flushPromises();
  expect(router.currentRoute.value.query).toEqual({
    status: 'all',
    membership: 'without',
  });
  expect(mocks.getList.mock.lastCall?.[2].filter).toBe(
    "memberships_via_client.status != 'active'",
  );
  wrapper.unmount();
});
