import { flushPromises, mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import { beforeEach, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { localParts, localToUtcIso, todayLocal } from '@/lib/datetime';
import type { Role } from '@/types/pb';
import CoachAgendaView from './CoachAgendaView.vue';
import CoachAvailabilityView from './CoachAvailabilityView.vue';

const mock = vi.hoisted(() => ({
  role: 'owner' as Role,
  list: vi.fn(),
}));
vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({ role: ref(mock.role), user: ref({ id: 'own' }) }),
}));
vi.mock('@/composables/useCoachAgenda', () => ({ useCoachAgenda: () => mock }));
vi.mock('@/composables/useNotify', () => ({
  useNotify: () => ({ success: vi.fn() }),
}));
vi.mock('@/composables/useServices', () => ({
  useServices: () => ({
    loadCoaches: async () => {},
    load: async () => {},
    coachesError: ref(null),
    error: ref(null),
    items: ref([]),
    coachOptions: ref([
      { value: 'another', label: 'Otro coach' },
      { value: 'own', label: 'Coach propio' },
    ]),
  }),
}));

const global = {
  plugins: [PrimeVue],
  stubs: {
    RouterLink: { template: '<a><slot /></a>' },
    PrivateSessionDialog: true,
    AvailabilityEditor: true,
    Drawer: {
      props: ['visible'],
      template: '<section v-if="visible"><slot /></section>',
    },
    Select: {
      props: ['modelValue', 'options'],
      emits: ['update:modelValue'],
      template: `<select :value="modelValue" @change="$emit('update:modelValue', $event.target.value)">
        <option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option>
      </select>`,
    },
  },
};

beforeEach(() => {
  vi.resetAllMocks();
  mock.role = 'owner';
  mock.list.mockResolvedValue({ sessions: [], slots: [] });
});

it.each([
  ['owner', 'another', false, false],
  ['coach', 'own', false, true],
  ['reception', 'another', true, true],
] as const)(
  'respeta permisos para %s al consultar distintos coaches',
  async (role, initial, ownReadonly, otherReadonly) => {
    mock.role = role;
    const wrapper = mount(CoachAvailabilityView, { global });
    await flushPromises();
    const editor = wrapper.getComponent({ name: 'AvailabilityEditor' });
    expect(editor.props()).toMatchObject({
      coach: initial,
      readonly: ownReadonly,
    });
    await wrapper.get('select').setValue('another');
    expect(editor.props()).toMatchObject({
      coach: 'another',
      readonly: otherReadonly,
    });
    expect(wrapper.text().includes('Disponibilidad de solo lectura.')).toBe(
      otherReadonly,
    );
    wrapper.unmount();
  },
);

it('consulta la semana y el día del coach y enlaza con asistencia', async () => {
  mock.role = 'coach';
  const today = todayLocal();
  mock.list.mockResolvedValue({
    sessions: [
      {
        id: 'session',
        title: 'Personal Training',
        starts_at: localToUtcIso(today, '10:00'),
        duration_min: 30,
        capacity: 2,
      },
    ],
    slots: [
      {
        id: 'slot',
        weekday: localParts(localToUtcIso(today, '10:00')).weekday,
        start_time: '08:00',
        end_time: '12:00',
      },
    ],
  });
  const wrapper = mount(CoachAgendaView, { global });
  await flushPromises();
  expect(wrapper.findAll('[data-day]')).toHaveLength(7);
  expect(mock.list).toHaveBeenLastCalledWith(
    'own',
    expect.any(String),
    expect.any(String),
  );
  await wrapper
    .findAll('button')
    .find((button) => button.text() === 'Día')!
    .trigger('click');
  await flushPromises();
  expect(mock.list).toHaveBeenLastCalledWith('own', today, today);
  const column = wrapper.get('[data-day]');
  expect(column.text()).toContain('08:00 – 12:00');
  expect(wrapper.findAll('[data-day]')).toHaveLength(1);
  await column.get('button').trigger('click');
  expect(wrapper.text()).toContain('Gestionar reservas y asistencia');
  await wrapper.get('select').setValue('another');
  await flushPromises();
  expect(mock.list).toHaveBeenLastCalledWith('another', today, today);
  expect(
    wrapper
      .findAll('button')
      .some((button) => button.text() === 'Sesión privada'),
  ).toBe(false);
  wrapper.unmount();
});
