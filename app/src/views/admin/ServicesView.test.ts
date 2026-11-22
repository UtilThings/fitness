import { flushPromises, mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import InputNumber from 'primevue/inputnumber';
import { beforeEach, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import CatalogActiveSwitch from '@/components/catalog/CatalogActiveSwitch.vue';
import type { Service } from '@/lib/catalog';
import ServicesView from './ServicesView.vue';

const mocks = vi.hoisted(() => ({
  can: vi.fn(),
  load: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
  move: vi.fn(),
  setActive: vi.fn(),
  loadCoaches: vi.fn(),
  countActivePlans: vi.fn(),
  require: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

const seed: Service[] = [
  ['Personal Training 1 a 1', 'personal-1-a-1', 'personal', 1, 24],
  ['Personal Training Partner', 'personal-partner', 'personal', 2, 24],
  ['Group Strength', 'group-strength', 'group', 6, 12],
  ['Tropical Jump', 'tropical-jump', 'group', 12, 12],
  ['Online Coaching', 'online-coaching', 'online', 0, 0],
].map(([name, slug, kind, capacity, cancellation_hours], sort) => ({
  id: String(slug),
  name: String(name),
  slug: String(slug),
  kind: kind as Service['kind'],
  capacity: Number(capacity),
  cancellation_hours: Number(cancellation_hours),
  sort,
  description: '',
  default_coach: '',
  active: true,
  collectionId: 'services',
  collectionName: 'services',
  created: '',
}));
const items = ref<Service[]>([]);

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({ can: mocks.can }),
}));
vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => ({ require: mocks.require }),
}));
vi.mock('@/composables/useNotify', () => ({ useNotify: () => mocks }));
vi.mock('@/composables/useServices', () => ({
  useServices: () => ({
    ...mocks,
    items,
    loading: ref(false),
    error: ref(null),
    coachOptions: ref([]),
    coachesError: ref(null),
  }),
}));

beforeEach(() => {
  vi.resetAllMocks();
  items.value = seed.map((row) => ({ ...row }));
  mocks.can.mockReturnValue(true);
});

function view() {
  return mount(ServicesView, {
    global: { plugins: [PrimeVue], stubs: { teleport: true } },
  });
}

it('renderiza los cinco servicios en orden y oculta la escritura para coach', async () => {
  mocks.can.mockReturnValue(false);
  const wrapper = view();
  await flushPromises();
  expect(
    wrapper.findAll('tbody tr').map((row) => row.get('td').text()),
  ).toEqual(seed.map((row) => row.name));
  expect(wrapper.text()).not.toContain('Nuevo servicio');
  expect(wrapper.find('[aria-label="Editar Tropical Jump"]').exists()).toBe(
    false,
  );
  expect(wrapper.findComponent(CatalogActiveSwitch).exists()).toBe(false);
});

it('edita la política, refleja el cambio y muestra errores de la API en el diálogo', async () => {
  mocks.save.mockRejectedValueOnce({
    fields: { cancellation_hours: 'Política no disponible' },
    message: 'Revisa los datos.',
  });
  mocks.save.mockImplementationOnce((data) => {
    items.value = items.value.map((item) =>
      item.id === 'tropical-jump' ? { ...item, ...data } : item,
    );
  });
  const wrapper = view();
  await wrapper.get('[aria-label="Editar Tropical Jump"]').trigger('click');
  const cancellation = wrapper
    .findAllComponents(InputNumber)
    .find((input) => input.props('inputId') === 'service-cancellation');
  cancellation!.vm.$emit('update:modelValue', 18);
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(wrapper.text()).toContain('Política no disponible');
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(mocks.save).toHaveBeenLastCalledWith(
    expect.objectContaining({ cancellation_hours: 18 }),
    'tropical-jump',
  );
  expect(wrapper.text()).toContain('18 h antes');
});

it('confirma la desactivación con el número de planes y espera a la aceptación', async () => {
  mocks.countActivePlans.mockResolvedValue(2);
  mocks.setActive.mockImplementation(() => {
    items.value = items.value.map((row) =>
      row.id === 'tropical-jump' ? { ...row, active: false } : row,
    );
  });
  const wrapper = view();
  const toggle = wrapper
    .findAllComponents(CatalogActiveSwitch)
    .find((component) => component.props('name') === 'Tropical Jump');
  toggle!.vm.$emit('change', false);
  await flushPromises();
  expect(mocks.countActivePlans).toHaveBeenCalledWith('tropical-jump');
  expect(mocks.require).toHaveBeenCalledWith(
    expect.objectContaining({ message: expect.stringContaining('2 planes') }),
  );
  expect(mocks.setActive).not.toHaveBeenCalled();
  await mocks.require.mock.calls[0]![0].accept();
  expect(mocks.setActive).toHaveBeenCalledWith('tropical-jump', false);
  expect(wrapper.text()).toContain('Inactivo');
});

it('crea con slug autogenerado y usa las flechas para persistir el orden', async () => {
  const wrapper = view();
  await wrapper.get('[aria-label="Subir Tropical Jump"]').trigger('click');
  expect(mocks.move).toHaveBeenCalledWith('tropical-jump', 'up');
  await flushPromises();
  const create = wrapper
    .findAll('button')
    .find((button) => button.text() === 'Nuevo servicio');
  await create!.trigger('click');
  await wrapper.get('#service-name').setValue('Preparación Física');
  expect(wrapper.get<HTMLInputElement>('#service-slug').element.value).toBe(
    'preparacion-fisica',
  );
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(mocks.save).toHaveBeenCalledWith(
    expect.objectContaining({ slug: 'preparacion-fisica' }),
    undefined,
  );
});
