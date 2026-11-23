import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import DataTable from 'primevue/datatable';
import Select from 'primevue/select';
import { beforeEach, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import MembershipActions from '@/components/memberships/MembershipActions.vue';
import type { Membership } from '@/lib/memberships';
import MembershipsView from './MembershipsView.vue';

const api = vi.hoisted(() => ({
  list: vi.fn(),
  can: vi.fn(),
  renew: vi.fn(),
  pause: vi.fn(),
  cancel: vi.fn(),
}));
vi.mock('@/composables/useAuth', () => ({ useAuth: () => ({ can: api.can }) }));
vi.mock('@/composables/useMemberships', () => ({ useMemberships: () => api }));
vi.mock('@/composables/usePlans', () => ({
  usePlans: () => ({
    items: ref([{ id: 'pack', name: 'Plan de fuerza' }]),
    error: ref(null),
    loading: ref(false),
    load: vi.fn(),
  }),
}));
const membership: Membership = {
  id: 'm',
  collectionName: 'memberships',
  collectionId: 'memberships',
  client: 'ana',
  plan: 'pack',
  status: 'active',
  starts_on: '2026-11-23',
  current_period_start: '2026-11-23',
  current_period_end: '2026-12-20',
  periods_paid: 1,
  commitment_periods_total: 4,
  credits_balance: 8,
  auto_renew: false,
  paused_at: '',
  ended_on: '',
  notes: '',
};
const global = {
  plugins: [PrimeVue],
  stubs: {
    RouterLink: RouterLinkStub,
    Dialog: {
      props: ['visible'],
      template: '<section v-if="visible"><slot /></section>',
    },
    Menu: {
      props: ['model'],
      template:
        '<button v-for="item in model" :key="item.label" @click="item.command()">{{ item.label }}</button>',
    },
  },
};
beforeEach(() => {
  vi.resetAllMocks();
  api.can.mockReturnValue(true);
  api.list.mockResolvedValue({
    items: [membership],
    totalItems: 40,
    totalPages: 2,
  });
});

it('pagina y aplica estado, plan y renovación pendiente', async () => {
  const wrapper = mount(MembershipsView, { global });
  await flushPromises();
  expect(wrapper.get('tbody').text()).toContain('pack');
  const table = wrapper.getComponent(DataTable);
  table.vm.$emit('page', { page: 1, rows: 20, first: 20, pageCount: 2 });
  await flushPromises();
  expect(api.list).toHaveBeenLastCalledWith(
    expect.objectContaining({ page: 2 }),
  );
  const [state, plan] = wrapper.findAllComponents(Select);
  state.vm.$emit('update:modelValue', 'paused');
  plan.vm.$emit('update:modelValue', 'pack');
  await flushPromises();
  expect(api.list).toHaveBeenLastCalledWith({
    page: 1,
    perPage: 20,
    status: 'paused',
    plan: 'pack',
    renewalPending: false,
  });
  state.vm.$emit('update:modelValue', 'renewal_pending');
  await flushPromises();
  expect(api.list).toHaveBeenLastCalledWith({
    page: 1,
    perPage: 20,
    status: null,
    plan: 'pack',
    renewalPending: true,
  });
  wrapper.unmount();
});

it.each([
  ['Renovar', 'renew', false],
  ['Pausar', 'pause', true],
  ['Cancelar membresía', 'cancel', true],
] as const)(
  'permite %s y actualiza la lista',
  async (label, action, needsNote) => {
    api[action].mockResolvedValueOnce({ membership });
    const wrapper = mount(MembershipsView, { global });
    await flushPromises();
    const actions = wrapper.getComponent(MembershipActions);
    await actions
      .findAll('button')
      .find((button) => button.text() === label)!
      .trigger('click');
    if (needsNote)
      await actions.get('textarea').setValue('A solicitud del cliente');
    await actions.get('form').trigger('submit');
    await flushPromises();
    expect(api[action]).toHaveBeenCalledWith(
      'm',
      needsNote ? 'A solicitud del cliente' : undefined,
    );
    expect(api.list).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  },
);

it('el coach puede consultar sin acciones de gestión', async () => {
  api.can.mockReturnValue(false);
  const wrapper = mount(MembershipsView, { global });
  await flushPromises();
  expect(wrapper.get('tbody').text()).toContain('pack');
  expect(wrapper.findComponent(MembershipActions).exists()).toBe(false);
  wrapper.unmount();
});
