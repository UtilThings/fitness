import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import Select from 'primevue/select';
import ToggleSwitch from 'primevue/toggleswitch';
import { beforeEach, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import AssessmentForm from '@/components/clients/AssessmentForm.vue';
import AssignPlanDialog from '@/components/memberships/AssignPlanDialog.vue';
import type { CreditMovement, Membership } from '@/lib/memberships';
import type { Client } from '@/lib/clients';
import ClientDetailView from './ClientDetailView.vue';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  setStatus: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  require: vi.fn(),
  push: vi.fn(),
  success: vi.fn(),
  listForClient: vi.fn(),
  ledger: vi.fn(),
  assign: vi.fn(),
}));
const isOwner = ref(false);
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRoute: () => ({ params: { id: 'ana' } }),
  useRouter: () => ({ push: mocks.push }),
}));
vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({
    isOwner,
    user: ref({ id: 'staff-id' }),
    can: () => isOwner.value,
  }),
}));
vi.mock('@/composables/useMemberships', () => ({
  useMemberships: () => mocks,
}));
vi.mock('@/composables/usePlans', () => ({
  usePlans: () => ({
    items: ref([{ id: 'pack', name: 'Plan de fuerza', active: true }]),
    error: ref(null),
    loading: ref(false),
    load: vi.fn(),
  }),
}));
vi.mock('@/composables/useClients', () => ({ useClients: () => mocks }));
vi.mock('@/composables/useNotify', () => ({
  useNotify: () => ({ success: mocks.success }),
}));
vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => ({ require: mocks.require }),
}));

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
  isOwner.value = false;
  mocks.get.mockResolvedValue(ana);
});

async function view() {
  const wrapper = mount(ClientDetailView, {
    global: {
      plugins: [PrimeVue],
      stubs: {
        RouterLink: RouterLinkStub,
        Dialog: {
          props: ['visible'],
          template: '<section v-if="visible"><slot /></section>',
        },
      },
    },
  });
  await flushPromises();
  return wrapper;
}

it('deshabilita y protege el cambio de clase gratis para coach y lo guarda para owner', async () => {
  const wrapper = await view();
  const mark = wrapper.getComponent(ToggleSwitch);
  expect(mark.props('disabled')).toBe(true);
  mark.vm.$emit('update:modelValue', true);
  expect(mocks.update).not.toHaveBeenCalled();

  isOwner.value = true;
  await wrapper.vm.$nextTick();
  expect(mark.props('disabled')).toBe(false);
  mocks.update.mockResolvedValueOnce({ ...ana, free_class_used: true });
  await mark.get('input').setValue(true);
  await flushPromises();
  expect(mocks.update).toHaveBeenCalledWith('ana', { free_class_used: true });
  expect(wrapper.text()).toMatch(/Primera clase gratis\s+usada/);
  wrapper.unmount();
});

it('conserva un cliente con historial y pide confirmación para inactivarlo', async () => {
  isOwner.value = true;
  mocks.remove.mockRejectedValueOnce({
    status: 409,
    message: 'El cliente tiene historial',
    fields: {},
  });
  mocks.setStatus.mockResolvedValueOnce({ ...ana, status: 'inactive' });
  const wrapper = await view();
  const button = (label: string) =>
    wrapper.findAll('button').find((item) => item.text() === label)!;
  await button('Eliminar').trigger('click');
  await mocks.require.mock.lastCall?.[0].accept();
  await flushPromises();
  expect(mocks.remove).toHaveBeenCalledWith('ana');
  expect(mocks.push).not.toHaveBeenCalled();
  expect(wrapper.text()).toContain('Tiene historial');
  await button('Inactivar cliente').trigger('click');
  expect(mocks.setStatus).not.toHaveBeenCalled();
  await mocks.require.mock.lastCall?.[0].accept();
  await flushPromises();
  expect(mocks.setStatus).toHaveBeenCalledWith('ana', 'inactive');
  expect(wrapper.text()).toContain('Inactivo');
  wrapper.unmount();
});

it('muestra el error de evaluación sin sustituir los datos guardados', async () => {
  const wrapper = await view();
  await wrapper
    .findAll('[role=tab]')
    .find((tab) => tab.text() === 'Evaluación inicial')!
    .trigger('click');
  const form = wrapper.getComponent(AssessmentForm);
  mocks.update.mockRejectedValueOnce({
    status: 400,
    message: 'Revisa los datos',
    fields: { assessment: 'lifestyle.stress_level · Valor inválido.' },
  });
  await form.get('input[id$="-stress_level"]').setValue('7');
  await form.get('form').trigger('submit');
  await flushPromises();
  expect(mocks.update).toHaveBeenCalledWith('ana', {
    assessment: {
      version: 1,
      completed_on: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      assessed_by: 'staff-id',
      lifestyle: { stress_level: 7 },
    },
  });
  expect(form.text()).toContain('lifestyle.stress_level · Valor inválido.');
  expect(form.props('assessment')).toBeNull();
  expect(mocks.success).not.toHaveBeenCalled();
  wrapper.unmount();
});

it('asigna un plan en la pestaña Membresías y recarga el saldo y el historial', async () => {
  isOwner.value = true;
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
  const movement: CreditMovement = {
    id: 'grant',
    collectionId: 'ledger',
    collectionName: 'credit_movements',
    membership: 'm',
    booking: '',
    delta: 8,
    reason: 'grant',
    note: '',
    created: '2026-11-23T15:00:00Z',
    created_by: '',
  };
  mocks.listForClient
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([membership]);
  mocks.assign.mockResolvedValueOnce({ membership, movement });
  mocks.ledger.mockResolvedValueOnce([movement]);
  const wrapper = await view();
  await wrapper
    .findAll('[role=tab]')
    .find((tab) => tab.text() === 'Membresías')!
    .trigger('click');
  await flushPromises();
  expect(wrapper.text()).toContain('El cliente aún no tiene membresías.');
  await wrapper
    .findAll('button')
    .find((button) => button.text() === 'Asignar plan')!
    .trigger('click');
  const dialog = wrapper.getComponent(AssignPlanDialog);
  dialog.getComponent(Select).vm.$emit('update:modelValue', 'pack');
  await dialog.vm.$nextTick();
  await dialog.get('form').trigger('submit');
  await flushPromises();
  expect(mocks.assign).toHaveBeenCalledWith(
    expect.objectContaining({ client: 'ana', plan: 'pack' }),
  );
  expect(mocks.ledger).toHaveBeenCalledWith('m');
  expect(wrapper.text()).toContain('Créditos: 8');
  expect(wrapper.text()).toContain('Otorgamiento');
  wrapper.unmount();
});
