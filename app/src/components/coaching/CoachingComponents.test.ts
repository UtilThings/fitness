import { flushPromises, mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import { beforeEach, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import type { CoachingProgram } from '@/lib/coaching';
import AdherenceBadge from './AdherenceBadge.vue';
import CheckinDialog from './CheckinDialog.vue';
import ProgramFormDialog from './ProgramFormDialog.vue';

const mocks = vi.hoisted(() => ({
  createProgram: vi.fn(),
  createCheckin: vi.fn(),
  listCoaches: vi.fn(),
  listOnlineMemberships: vi.fn(),
}));
vi.mock('@/composables/useCoaching', () => ({ useCoaching: () => mocks }));
vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({ user: ref(null) }),
}));
vi.mock('@/lib/datetime', () => ({ todayLocal: () => '2026-03-01' }));

const program: CoachingProgram = {
  id: 'remote',
  client: 'ana',
  coach: 'coach1',
  membership: 'm1',
  starts_on: '2026-01-05',
  renews_on: '',
  status: 'active',
  duration_weeks: 12,
  goal: '',
  notes: '',
  program_url: '',
};
const global = {
  plugins: [PrimeVue],
  stubs: {
    Dialog: {
      props: ['visible'],
      template: '<section v-if="visible"><slot /></section>',
    },
  },
};

beforeEach(() => vi.resetAllMocks());

it('distingue la adherencia baja y muestra el promedio y su tendencia', () => {
  const wrapper = mount(AdherenceBadge, {
    props: { value: 2, trend: 'down' },
    global,
  });
  expect(wrapper.getComponent(Tag).props('severity')).toBe('danger');
  expect(wrapper.text()).toContain('2 / 5');
  expect(wrapper.text()).toContain('A la baja');
});

it('exige adherencia de 1 a 5, rechaza fechas futuras y guarda los datos válidos', async () => {
  const wrapper = mount(CheckinDialog, {
    props: { program, visible: true },
    global,
  });
  await wrapper.get('form').trigger('submit');
  expect(wrapper.text()).toContain('entero entre 1 y 5');
  expect(mocks.createCheckin).not.toHaveBeenCalled();
  const buttons = wrapper.findAll('fieldset button');
  expect(buttons.map((button) => button.text())).toEqual([
    '1',
    '2',
    '3',
    '4',
    '5',
  ]);
  await buttons[3]!.trigger('click');
  await wrapper.get('input[type=date]').setValue('2026-03-02');
  await wrapper.get('form').trigger('submit');
  expect(wrapper.text()).toContain('Indica una fecha válida hasta hoy');
  expect(mocks.createCheckin).not.toHaveBeenCalled();
  await wrapper.get('input[type=date]').setValue('2026-03-01');
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(mocks.createCheckin).toHaveBeenCalledWith('remote', {
    checked_at: '2026-03-01',
    adherence: 4,
    notes: '',
  });
  expect(wrapper.emitted('saved')).toHaveLength(1);
});

it('ofrece clientes con membresía elegible y exige coach y duración válidos', async () => {
  mocks.listOnlineMemberships.mockResolvedValue([
    {
      id: 'm1',
      client: 'ana',
      status: 'active',
      expand: { client: { first_name: 'Ana', last_name: 'García' } },
    },
    {
      id: 'm2',
      client: 'bea',
      status: 'paused',
      expand: { client: { first_name: 'Bea', last_name: 'García' } },
    },
  ]);
  mocks.listCoaches.mockResolvedValue([{ id: 'coach1', name: 'Andrea' }]);
  const wrapper = mount(ProgramFormDialog, {
    props: { visible: true },
    global,
  });
  await flushPromises();
  const select = (suffix: string) =>
    wrapper
      .findAllComponents(Select)
      .find((item) => item.props('inputId')?.endsWith('-' + suffix))!;
  expect(select('client').props('options')).toEqual([
    { value: 'ana', label: 'Ana García' },
  ]);
  select('client').vm.$emit('update:modelValue', 'ana');
  select('duration').vm.$emit('update:modelValue', 10);
  await wrapper.get('form').trigger('submit');
  expect(wrapper.text()).toContain('Selecciona un coach activo');
  expect(wrapper.text()).toContain('Selecciona 8, 12 o 16 semanas');
  expect(mocks.createProgram).not.toHaveBeenCalled();
  select('coach').vm.$emit('update:modelValue', 'coach1');
  select('duration').vm.$emit('update:modelValue', 12);
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(mocks.createProgram).toHaveBeenCalledWith(
    expect.objectContaining({
      client: 'ana',
      membership: 'm1',
      coach: 'coach1',
      duration_weeks: 12,
    }),
  );
});
