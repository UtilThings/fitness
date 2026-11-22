import { flushPromises, mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import Select from 'primevue/select';
import ToggleSwitch from 'primevue/toggleswitch';
import { beforeEach, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { CATALOG_SEED } from '../../../../api/src/lib/catalog';
import type { Plan, Service } from '@/lib/catalog';
import PlansView from './PlansView.vue';

const mocks = vi.hoisted(() => ({
  can: vi.fn(),
  load: vi.fn(),
  loadServices: vi.fn(),
  save: vi.fn(),
  move: vi.fn(),
  remove: vi.fn(),
  setActive: vi.fn(),
  require: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

const services = ref<Service[]>([]);
const items = ref<Plan[]>([]);
const seed = CATALOG_SEED.flatMap(({ slug, plans }) =>
  plans.map((plan) => ({
    ...plan,
    id: plan.name,
    service: slug,
    collectionId: 'plans',
    collectionName: 'plans',
    created: '',
  })),
);

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({ can: mocks.can }),
}));
vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => ({ require: mocks.require }),
}));
vi.mock('@/composables/useNotify', () => ({ useNotify: () => mocks }));
vi.mock('@/composables/usePlans', () => ({
  usePlans: () => ({ ...mocks, items, loading: ref(false), error: ref(null) }),
}));
vi.mock('@/composables/useServices', () => ({
  useServices: () => ({
    items: services,
    load: mocks.loadServices,
    error: ref(null),
  }),
}));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.can.mockReturnValue(true);
  services.value = CATALOG_SEED.map((service) => ({
    ...service,
    id: service.slug,
    description: service.description ?? '',
    default_coach: '',
    collectionId: 'services',
    collectionName: 'services',
    created: '',
  }));
  mocks.load.mockImplementation((service?: string) => {
    items.value = seed
      .filter((plan) => !service || plan.service === service)
      .map((plan) => ({ ...plan }));
  });
});

async function view(path = '/plans') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/plans', component: PlansView }],
  });
  await router.push(path);
  const wrapper = mount(PlansView, {
    global: { plugins: [PrimeVue, router], stubs: { teleport: true } },
  });
  await flushPromises();
  return { wrapper, router };
}

it('muestra diez planes, el precio, el compromiso y las marcas', async () => {
  mocks.can.mockReturnValue(false);
  const { wrapper } = await view();
  expect(wrapper.findAll('tbody tr')).toHaveLength(10);
  expect(wrapper.text()).toContain('$1,447');
  expect(wrapper.text()).toContain('16 semanas');
  expect(wrapper.text()).toContain('Primera clase');
  expect(wrapper.text()).toContain('Gratis');
  expect(wrapper.text()).not.toContain('Nuevo plan');
  expect(wrapper.find('[aria-label="Editar Single Class"]').exists()).toBe(
    false,
  );
});

it('filtra por servicio, conserva el filtro en la URL y ordena dentro del grupo', async () => {
  const { wrapper, router } = await view();
  wrapper.getComponent(Select).vm.$emit('update:modelValue', 'tropical-jump');
  await flushPromises();
  expect(router.currentRoute.value.query.service).toBe('tropical-jump');
  expect(mocks.load).toHaveBeenLastCalledWith('tropical-jump');
  expect(wrapper.findAll('tbody tr')).toHaveLength(2);
  await wrapper.get('[aria-label="Bajar Single Class"]').trigger('click');
  expect(mocks.move).toHaveBeenCalledWith('Single Class', 'down');
  const reloaded = await view(router.currentRoute.value.fullPath);
  expect(reloaded.wrapper.findAll('tbody tr')).toHaveLength(2);
});

it('convierte dólares a centavos y rechaza un precio negativo', async () => {
  const { wrapper } = await view();
  await wrapper.get('[aria-label="Editar Partner 3x / week"]').trigger('click');
  const price = wrapper.get<HTMLInputElement>('#plan-price');
  expect(price.element.value).toBe('1447.00');
  await price.setValue('-5');
  await wrapper.get('form').trigger('submit');
  expect(mocks.save).not.toHaveBeenCalled();
  expect(wrapper.text()).toContain('Indica un precio mayor que cero');
  await price.setValue('1,500.25');
  await wrapper.get('form').trigger('submit');
  expect(mocks.save).toHaveBeenCalledWith(
    expect.objectContaining({ price_cents: 150025 }),
    'Partner 3x / week',
  );
});

it('fuerza los datos de la primera clase y muestra el rechazo del servidor', async () => {
  mocks.save.mockRejectedValueOnce({
    message: 'Revisa los datos.',
    fields: { is_first_class: 'Ya existe un plan de primera clase.' },
  });
  const { wrapper } = await view();
  await wrapper.get('[aria-label="Editar Single Class"]').trigger('click');
  const toggle = wrapper
    .findAllComponents(ToggleSwitch)
    .find((component) => component.props('inputId') === 'plan-first');
  toggle!.vm.$emit('update:modelValue', true);
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(mocks.save).toHaveBeenCalledWith(
    expect.objectContaining({
      price_cents: 0,
      billing_unit: 'first_visit',
      is_first_class: true,
    }),
    'Single Class',
  );
  expect(wrapper.text()).toContain('Ya existe un plan de primera clase.');
});

it('deshabilita activar un plan de un servicio inactivo', async () => {
  services.value = services.value.map((service) => ({
    ...service,
    active: service.slug !== 'tropical-jump',
  }));
  mocks.load.mockImplementation(() => {
    items.value = seed
      .filter((plan) => plan.service === 'tropical-jump')
      .map((plan) => ({ ...plan, active: false }));
  });
  const { wrapper } = await view();
  expect(
    wrapper.get<HTMLInputElement>('[aria-label="Activar Single Class"]').element
      .disabled,
  ).toBe(true);
  await wrapper.get('[aria-label="Editar Single Class"]').trigger('click');
  expect(wrapper.get<HTMLInputElement>('#plan-active').element.disabled).toBe(
    true,
  );
  expect(wrapper.text()).toContain('El servicio está inactivo.');
});

it('crea un plan para el servicio filtrado', async () => {
  const { wrapper } = await view('/plans?service=tropical-jump');
  await wrapper
    .findAll('button')
    .find((button) => button.text() === 'Nuevo plan')!
    .trigger('click');
  await wrapper.get('#plan-name').setValue('Pase flexible');
  await wrapper.get('#plan-price').setValue('17.50');
  await wrapper.get('form').trigger('submit');
  expect(mocks.save).toHaveBeenCalledWith(
    expect.objectContaining({
      name: 'Pase flexible',
      service: 'tropical-jump',
      price_cents: 1750,
    }),
    undefined,
  );
});
