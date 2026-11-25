import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import Select from 'primevue/select';
import { beforeEach, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import DataToolbar from '@/components/DataToolbar.vue';
import type { CollectionFilter } from '@/composables/useCollection';
import { withLocale } from '@/test/i18n';
import TeamView from './TeamView.vue';

const mocks = vi.hoisted(() => ({
  can: vi.fn(),
  load: vi.fn(),
  search: vi.fn(),
  setPage: vi.fn(),
  setActive: vi.fn(),
  deleteOrDeactivate: vi.fn(),
  confirmDelete: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
const coach = {
  id: 'coach',
  name: 'Ana Pérez',
  email: 'ana@example.test',
  role: 'coach',
  active: true,
  avatar: '',
};
const items = ref([coach]);
const filters = ref<CollectionFilter[]>([]);

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({ user: ref({ id: 'owner' }), can: mocks.can }),
}));
vi.mock('@/composables/useConfirmDelete', () => ({
  useConfirmDelete: () => ({ confirmDelete: mocks.confirmDelete }),
}));
vi.mock('@/composables/useNotify', () => ({
  useNotify: () => ({
    success: mocks.success,
    error: mocks.error,
    info: vi.fn(),
  }),
}));
vi.mock('@/composables/useTeam', () => ({
  useTeam: () => ({
    ...mocks,
    items,
    filters,
    loading: ref(false),
    error: ref(null),
    page: ref(1),
    perPage: ref(20),
    total: ref(1),
  }),
}));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.can.mockReturnValue(true);
  items.value = [coach];
  filters.value = [];
});

function view() {
  return mount(TeamView, {
    global: {
      plugins: [PrimeVue],
      stubs: { RouterLink: RouterLinkStub, teleport: true },
    },
  });
}

it('permite ver la ficha a todos y reserva la gestión al owner', async () => {
  const owner = view();
  await flushPromises();
  expect(owner.text()).toContain('Nuevo integrante');
  expect(owner.text()).toContain('Eliminar');
  await withLocale('en', async () => {
    await flushPromises();
    expect(owner.text()).toContain('New team member');
    expect(owner.text()).toContain('Delete');
    expect(owner.text()).toContain(coach.name);
  });
  expect(owner.getComponent(RouterLinkStub).props('to')).toEqual({
    name: 'team-member',
    params: { id: coach.id },
  });
  mocks.can.mockReturnValue(false);
  const readOnly = view();
  await flushPromises();
  expect(readOnly.text()).toContain(coach.name);
  expect(readOnly.text()).not.toContain('Nuevo integrante');
  expect(readOnly.text()).not.toContain('Acciones');
  expect(readOnly.text()).not.toContain('Eliminar');
});

it('busca por nombre o correo y aplica filtros de rol y estado', async () => {
  const wrapper = view();
  await flushPromises();
  wrapper.getComponent(DataToolbar).vm.$emit('search', 'ana@');
  expect(mocks.search).toHaveBeenCalledWith('ana@', ['name', 'email']);
  const [role, status] = wrapper.findAllComponents(Select);
  role!.vm.$emit('update:modelValue', 'coach');
  status!.vm.$emit('update:modelValue', false);
  status!.vm.$emit('change', {
    value: false,
    originalEvent: new Event('change'),
  });
  await flushPromises();
  expect(filters.value).toEqual([
    { expression: 'role = {:role}', params: { role: 'coach' } },
    { expression: 'active = {:active}', params: { active: false } },
  ]);
  expect(mocks.setPage).toHaveBeenCalledWith(1);
});

it('pide confirmación y ofrece desactivar tras el 409', async () => {
  mocks.deleteOrDeactivate.mockResolvedValue({ needsDeactivate: true });
  mocks.setActive.mockImplementation(
    () => (items.value = [{ ...coach, active: false }]),
  );
  const wrapper = view();
  await flushPromises();
  await wrapper
    .findAll('button')
    .find((button) => button.text() === 'Eliminar')!
    .trigger('click');
  const [{ onConfirm }] = mocks.confirmDelete.mock.calls[0]!;
  await onConfirm();
  await flushPromises();
  expect(wrapper.text()).toContain('Tiene registros asociados');
  expect(mocks.setActive).not.toHaveBeenCalled();
  await wrapper
    .get('[role=dialog]')
    .findAll('button')
    .find((button) => button.text() === 'Desactivar')!
    .trigger('click');
  await flushPromises();
  expect(mocks.setActive).toHaveBeenCalledWith(coach.id, false);
  expect(wrapper.text()).toContain('Inactivo');
});

it('muestra el mensaje devuelto por la API', async () => {
  mocks.setActive.mockRejectedValue({
    status: 400,
    message: 'Debe quedar al menos un owner activo',
    fields: {},
  });
  const wrapper = view();
  await flushPromises();
  await wrapper
    .findAll('button')
    .find((button) => button.text() === 'Desactivar')!
    .trigger('click');
  await flushPromises();
  expect(mocks.error).toHaveBeenCalledWith(
    'Debe quedar al menos un owner activo',
  );
});
