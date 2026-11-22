import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import ToggleSwitch from 'primevue/toggleswitch';
import { beforeEach, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import AssessmentForm from '@/components/clients/AssessmentForm.vue';
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
}));
const isOwner = ref(false);
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRoute: () => ({ params: { id: 'ana' } }),
  useRouter: () => ({ push: mocks.push }),
}));
vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({ isOwner, user: ref({ id: 'staff-id' }) }),
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
    global: { plugins: [PrimeVue], stubs: { RouterLink: RouterLinkStub } },
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
