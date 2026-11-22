import { flushPromises, mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { localToUtcIso } from '@/lib/datetime';
import type { ClassSession } from '@/lib/schedule-week';
import type { Role } from '@/types/pb';
import ClassesView from './ClassesView.vue';

const api = vi.hoisted(() => ({
  loadWeek: vi.fn(),
  cancelSession: vi.fn(),
  moveSession: vi.fn(),
}));
const role = ref<Role>('owner');
const sessions = ref<ClassSession[]>([]);
vi.mock('@/composables/useSchedule', () => ({
  useSchedule: () => ({
    ...api,
    sessions,
    loading: ref(false),
    error: ref(null),
  }),
}));
vi.mock('@/composables/useAuth', async () => {
  const { computed } = await import('vue');
  return {
    useAuth: () => ({
      role,
      isOwner: computed(() => role.value === 'owner'),
      user: ref({ id: 'jq' }),
    }),
  };
});
vi.mock('@/composables/useNotify', () => ({
  useNotify: () => ({ success: vi.fn(), error: vi.fn() }),
}));
vi.mock('@/composables/useServices', () => ({
  useServices: () => ({
    items: ref([
      { id: 'jump', name: 'Tropical Jump', active: true },
      { id: 'strength', name: 'Group Strength', active: true },
    ]),
    coachOptions: ref([
      { label: 'Coach JQ', value: 'jq' },
      { label: 'Otro coach', value: 'other' },
    ]),
    error: ref(null),
    coachesError: ref(null),
    load: vi.fn(),
    loadCoaches: vi.fn(),
  }),
}));

const slots = [
  ['2026-11-02', '19:30'],
  ['2026-11-04', '19:30'],
  ['2026-11-07', '09:00'],
  ['2026-11-03', '09:00'],
  ['2026-11-03', '17:30'],
  ['2026-11-03', '19:00'],
  ['2026-11-05', '09:00'],
  ['2026-11-05', '17:30'],
  ['2026-11-05', '19:00'],
] as const;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-04T14:00:00Z'));
  role.value = 'owner';
  sessions.value = slots.map(([date, time], index) => ({
    id: String(index),
    collectionId: 'sessions',
    collectionName: 'class_sessions',
    template: 'template',
    service: index < 3 ? 'jump' : 'strength',
    coach: index < 3 ? 'jq' : 'other',
    starts_at: localToUtcIso(date, time),
    duration_min: 60,
    capacity: 6,
    status: 'scheduled',
    kind: 'regular',
    cancel_reason: '',
    notes: '',
  }));
});
afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

async function render(query = '') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/classes', component: ClassesView }],
  });
  await router.push('/classes' + query);
  const wrapper = mount(ClassesView, {
    global: {
      plugins: [PrimeVue, router],
      stubs: {
        Drawer: {
          props: ['visible'],
          template: '<aside v-if="visible"><slot /></aside>',
        },
        Dialog: {
          props: ['visible'],
          template: '<section v-if="visible"><slot /></section>',
        },
        Select: {
          props: ['options', 'modelValue'],
          emits: ['update:modelValue'],
          template:
            '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option></select>',
        },
      },
    },
  });
  return {
    router,
    wrapper,
    button: (label: string) =>
      wrapper.findAll('button').find((node) => node.text() === label)!,
  };
}

it('renders nine seeded local slots and supports service filters and week navigation', async () => {
  const { wrapper, button } = await render();
  expect(wrapper.findAll('[data-day]')).toHaveLength(7);
  expect(wrapper.findAll('[data-session]')).toHaveLength(9);
  expect(
    wrapper.get('[data-day="2026-11-02"] [data-session="0"]').text(),
  ).toContain('7:30 PM');
  expect(
    wrapper.get('[data-day="2026-11-07"] [data-session="2"]').text(),
  ).toContain('9:00 AM');
  await wrapper.get('select[aria-label="Servicio"]').setValue('strength');
  expect(wrapper.findAll('[data-session]')).toHaveLength(6);
  await wrapper.get('[aria-label="Semana anterior"]').trigger('click');
  expect(wrapper.find('[data-day="2026-10-25"]').exists()).toBe(true);
  expect(api.loadWeek).toHaveBeenLastCalledWith(-1);
  await button('Hoy').trigger('click');
  await wrapper.get('[aria-label="Semana siguiente"]').trigger('click');
  expect(api.loadWeek).toHaveBeenLastCalledWith(1);
});

it('preselects a coach from the URL and toggles Mis clases', async () => {
  const { wrapper, router, button } = await render('?coach=other');
  expect(wrapper.findAll('[data-session]')).toHaveLength(6);
  await button('Mis clases').trigger('click');
  await flushPromises();
  expect(router.currentRoute.value.query.coach).toBe('jq');
  expect(wrapper.findAll('[data-session]')).toHaveLength(3);
  await button('Mis clases').trigger('click');
  await flushPromises();
  expect(wrapper.findAll('[data-session]')).toHaveLength(9);
});

it('requires a reason, then refreshes the cancelled card', async () => {
  api.cancelSession.mockImplementation(async (_id, reason) => {
    sessions.value[0] = {
      ...sessions.value[0]!,
      status: 'cancelled',
      cancel_reason: reason,
    };
  });
  const { wrapper, button } = await render();
  await wrapper.get('[data-session="0"]').trigger('click');
  await button('Cancelar sesión').trigger('click');
  wrapper
    .get('#session-reason')
    .element.closest('form')!
    .dispatchEvent(new Event('submit', { cancelable: true }));
  await flushPromises();
  expect(wrapper.text()).toContain('Escribe un motivo');
  expect(api.cancelSession).not.toHaveBeenCalled();
  await wrapper.get('#session-reason').setValue('Coach enfermo');
  wrapper
    .get('#session-reason')
    .element.closest('form')!
    .dispatchEvent(new Event('submit', { cancelable: true }));
  await flushPromises();
  expect(api.cancelSession).toHaveBeenCalledWith('0', 'Coach enfermo');
  expect(wrapper.get('[data-session="0"]').text()).toContain(
    'Cancelada · Coach enfermo',
  );
});

it('submits a move using the local date and renders the replacement on that day', async () => {
  api.moveSession.mockImplementation(async (_id, { startsAt }) => {
    sessions.value = [
      ...sessions.value,
      { ...sessions.value[0]!, id: 'replacement', starts_at: startsAt },
    ];
  });
  const { wrapper, button } = await render();
  await wrapper.get('[data-session="0"]').trigger('click');
  await button('Mover sesión').trigger('click');
  await wrapper.get('#session-date').setValue('2026-11-06');
  await wrapper.get('#session-time').setValue('19:30');
  await wrapper.get('#session-reason').setValue('Cambio de horario');
  wrapper
    .get('#session-reason')
    .element.closest('form')!
    .dispatchEvent(new Event('submit', { cancelable: true }));
  await flushPromises();
  expect(api.moveSession).toHaveBeenCalledWith('0', {
    startsAt: '2026-11-07T00:30:00.000Z',
    coach: 'jq',
    reason: 'Cambio de horario',
  });
  expect(
    wrapper.get('[data-day="2026-11-06"] [data-session="replacement"]').text(),
  ).toContain('7:30 PM');
});

it('hides session mutations from coaches', async () => {
  role.value = 'coach';
  const { wrapper, button } = await render();
  await wrapper.get('[data-session="0"]').trigger('click');
  for (const label of [
    'Generar sesiones',
    'Nueva sesión especial',
    'Cancelar sesión',
    'Mover sesión',
  ]) {
    expect(button(label)).toBeUndefined();
  }
});
