import { flushPromises, mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import { beforeEach, expect, it, vi } from 'vitest';
import type { AgendaSession } from '@/lib/agenda';
import AvailabilityEditor from './AvailabilityEditor.vue';
import CoachAgendaGrid from './CoachAgendaGrid.vue';
import PrivateSessionDialog from './PrivateSessionDialog.vue';

const mock = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  createPrivate: vi.fn(),
  privateEligibility: vi.fn(),
}));
vi.mock('@/composables/useCoachAvailability', () => ({
  useCoachAvailability: () => mock,
}));
vi.mock('@/composables/useCoachAgenda', () => ({ useCoachAgenda: () => mock }));
vi.mock('@/composables/useMemberships', () => ({ useMemberships: () => mock }));
const global = {
  plugins: [PrimeVue],
  stubs: {
    Dialog: {
      props: ['visible'],
      template: '<section v-if="visible"><slot /></section>',
    },
    Select: {
      props: ['modelValue'],
      emits: ['update:modelValue'],
      template:
        '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    },
    ClientPicker: {
      props: ['label'],
      emits: ['update:modelValue'],
      template: `<button type="button" @click="$emit('update:modelValue', { id: 'client', first_name: 'Ana', last_name: 'Sol' })">{{ label }}</button>`,
    },
  },
};

beforeEach(() => {
  vi.resetAllMocks();
  mock.list.mockResolvedValue([]);
  mock.privateEligibility.mockResolvedValue({ allowed: true, partner: false });
});

it('impide guardar un solape o un tramo con fin igual al inicio', async () => {
  mock.list.mockResolvedValue([
    {
      id: 'one',
      coach: 'jq',
      weekday: 0,
      start_time: '08:00',
      end_time: '12:00',
    },
  ]);
  const wrapper = mount(AvailabilityEditor, { props: { coach: 'jq' }, global });
  await flushPromises();
  await wrapper
    .findAll('button')
    .find((button) => button.text() === 'Añadir tramo')!
    .trigger('click');
  const [start, end] = wrapper.findAll('input[type=time]');
  await start!.setValue('11:00');
  await end!.setValue('11:00');
  await wrapper.get('form').trigger('submit');
  expect(wrapper.text()).toContain('hora final posterior');
  await end!.setValue('13:00');
  await wrapper.get('form').trigger('submit');
  expect(wrapper.text()).toContain('se solapa');
  expect(mock.create).not.toHaveBeenCalled();
  wrapper.unmount();
});

it('coloca las sesiones en su día de Nueva York y muestra el cliente reservado', () => {
  const sessions = [
    {
      id: 'before',
      title: 'Antes',
      starts_at: '2026-11-23 04:55:00.000Z',
      expand: {
        bookings_via_session: [
          {
            id: 'booking',
            status: 'booked',
            expand: { client: { first_name: 'Ana', last_name: 'Sol' } },
          },
        ],
      },
    },
    { id: 'after', title: 'Después', starts_at: '2026-11-23 05:05:00.000Z' },
  ] as AgendaSession[];
  const wrapper = mount(CoachAgendaGrid, {
    props: { days: ['2026-11-22', '2026-11-23'], sessions, slots: [] },
  });
  expect(wrapper.get('[data-day="2026-11-22"]').text()).toContain('Antes');
  expect(wrapper.get('[data-day="2026-11-22"]').text()).toContain('Ana Sol');
  expect(wrapper.get('[data-day="2026-11-23"]').text()).toContain('Después');
  expect(wrapper.get('[data-day="2026-11-23"]').text()).not.toContain('Antes');
  wrapper.unmount();
});

it.each([
  ['coach_conflict', 'El coach ya tiene una sesión en ese horario.'],
  [
    'outside_availability',
    'Elige un horario dentro de un tramo de disponibilidad del coach.',
  ],
  ['invalid_capacity', 'El cupo debe ser de una o dos personas'],
  ['partner_required', 'Cada cliente necesita una membresía partner'],
  ['no_credits', 'El cliente no tiene créditos disponibles.'],
  ['weekly_limit', 'El cliente alcanzó su límite semanal de reservas.'],
])('muestra un mensaje al recibir %s', async (code, message) => {
  mock.createPrivate.mockRejectedValue({
    code,
    message: 'Fallo',
    fields: {},
    status: 400,
  });
  const wrapper = mount(PrivateSessionDialog, {
    props: {
      modelValue: true,
      services: [],
      coaches: [],
      initialDate: '2099-06-04',
      initialTime: '10:30',
      lockedCoach: 'jq',
    },
    global,
  });
  const service = wrapper.findAllComponents(global.stubs.Select)[1]!;
  service.vm.$emit('update:modelValue', 'training');
  await wrapper
    .findAll('button')
    .find((button) => button.text() === 'Primer cliente')!
    .trigger('click');
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(wrapper.text()).toContain(message);
  expect(mock.privateEligibility).toHaveBeenCalledWith(
    'client',
    'training',
    '2099-06-04T14:30:00.000Z',
  );
  wrapper.unmount();
});
