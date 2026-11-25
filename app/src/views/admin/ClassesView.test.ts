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
  listAvailability: vi.fn(),
  listBySession: vi.fn(),
  listSlots: vi.fn(),
  createSpecial: vi.fn(),
  createPrivate: vi.fn(),
  privateEligibility: vi.fn(),
  updateSession: vi.fn(),
  generate: vi.fn(),
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
vi.mock('@/composables/useCoachAgenda', () => ({
  useCoachAgenda: () => api,
}));
vi.mock('@/composables/useCoachAvailability', () => ({
  useCoachAvailability: () => ({ list: api.listSlots }),
}));
vi.mock('@/composables/useMemberships', () => ({
  useMemberships: () => ({ privateEligibility: api.privateEligibility }),
}));
vi.mock('@/composables/useSessionAvailability', () => ({
  useSessionAvailability: () => ({ list: api.listAvailability }),
}));
vi.mock('@/composables/useBookings', () => ({
  useBookings: () => ({ listBySession: api.listBySession }),
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
      {
        id: 'training',
        name: 'Personal Training',
        kind: 'personal',
        active: true,
      },
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
  api.listAvailability.mockResolvedValue([
    { session: '0', availability: 'full', spots_left: 0 },
    { session: '1', availability: 'almost', spots_left: 1 },
    { session: '2', availability: 'available', spots_left: 3 },
  ]);
  api.listBySession.mockResolvedValue([]);
  api.listSlots.mockResolvedValue([]);
  api.privateEligibility.mockResolvedValue({ allowed: true, partner: false });
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
        ClientPicker: {
          props: ['label'],
          emits: ['update:modelValue'],
          template: `<button type="button" @click="$emit('update:modelValue', { id: 'client' })">{{ label }}</button>`,
        },
        Select: {
          props: ['options', 'modelValue', 'optionLabel', 'optionValue'],
          emits: ['update:modelValue'],
          template:
            '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="option in options" :key="option[optionValue]" :value="option[optionValue]">{{ option[optionLabel] }}</option></select>',
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
  ).toMatch(/7:30\s*p\.\s*m\./);
  expect(
    wrapper.get('[data-day="2026-11-07"] [data-session="2"]').text(),
  ).toMatch(/9:00\s*a\.\s*m\./);
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
  ).toMatch(/7:30\s*p\.\s*m\./);
});

it('hides session mutations from coaches', async () => {
  role.value = 'coach';
  const { wrapper, button } = await render();
  await wrapper.get('[data-session="0"]').trigger('click');
  for (const label of [
    'Generar sesiones',
    'Nueva clase especial',
    'Cancelar sesión',
    'Mover sesión',
  ]) {
    expect(button(label)).toBeUndefined();
  }
});

it('shows real availability and refreshes the roster and calendar after a booking', async () => {
  const { wrapper, button } = await render();
  await flushPromises();
  expect(api.listAvailability).toHaveBeenCalledWith({
    from: '2026-11-01',
    to: '2026-11-08',
  });
  expect(wrapper.get('[data-session="0"]').text()).toContain('Llena · 0 cupos');
  expect(wrapper.get('[data-session="1"]').text()).toContain(
    'Casi llena · 1 cupo',
  );
  expect(wrapper.get('[data-session="2"]').text()).toContain(
    'Disponible · 3 cupos',
  );
  await wrapper.get('[data-session="2"]').trigger('click');
  expect(api.listBySession).toHaveBeenLastCalledWith('2');
  expect(button('Reservar')).toBeDefined();
  api.listBySession.mockResolvedValue([
    {
      id: 'booking',
      client: 'Ana',
      status: 'waitlisted',
      waitlist_position: 1,
    },
  ]);
  wrapper
    .findComponent({ name: 'BookingDialog' })
    .vm.$emit('booked', { status: 'waitlisted' });
  await flushPromises();
  expect(wrapper.get('table[aria-label="Lista de espera"]').text()).toContain(
    'Ana',
  );
  expect(api.listAvailability).toHaveBeenCalledTimes(2);
  wrapper.unmount();
});

it('crea una especial con título e insignia, y permite editar sus detalles', async () => {
  api.createSpecial.mockImplementation(async (input) => {
    const session = {
      ...sessions.value[0]!,
      ...input,
      id: 'event',
      kind: 'special' as const,
      template: '',
    };
    sessions.value.push(session);
    return session;
  });
  const { wrapper, button } = await render();
  await button('Nueva clase especial').trigger('click');
  await wrapper
    .get('form input[maxlength="120"]')
    .setValue('Taller de movilidad');
  await wrapper.get('form select').setValue('strength');
  await wrapper.get('form input[type=date]').setValue('2026-11-06');
  await wrapper.get('form input[type=time]').setValue('11:00');
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(api.createSpecial).toHaveBeenCalledWith(
    expect.objectContaining({
      title: 'Taller de movilidad',
      service: 'strength',
      capacity: 1,
      starts_at: '2026-11-06T16:00:00.000Z',
    }),
  );
  const card = wrapper.get('[data-session="event"]');
  expect(card.text()).toContain('Taller de movilidad');
  expect(card.text()).toContain('Especial');
  await card.trigger('click');
  await wrapper.get('#detail-title').setValue('Movilidad en grupo');
  await wrapper.get('aside form').trigger('submit');
  await flushPromises();
  expect(api.updateSession).toHaveBeenCalledWith(
    'event',
    expect.objectContaining({ title: 'Movilidad en grupo', capacity: 1 }),
  );
  wrapper.unmount();
});

it('agenda una privada desde el primer hueco libre del día', async () => {
  api.createPrivate.mockImplementation(async (input) => {
    const session = {
      ...sessions.value[0]!,
      ...input,
      id: 'pt',
      kind: 'private' as const,
      template: '',
    };
    sessions.value.push(session);
    return { session, bookings: [] };
  });
  const { wrapper } = await render('?coach=other');
  const nowInView = wrapper.get('[data-day="2026-11-05"]');
  await nowInView.get('button[aria-label^="Agregar sesión"]').trigger('click');
  await nowInView
    .findAll('button')
    .find((button) => button.text() === 'Sesión privada')!
    .trigger('click');
  expect(
    (wrapper.get('form input[type=date]').element as HTMLInputElement).value,
  ).toBe('2026-11-05');
  expect(
    (wrapper.get('form input[type=time]').element as HTMLInputElement).value,
  ).toBe('10:00');
  await wrapper.findAll('form select')[1]!.setValue('training');
  await wrapper
    .findAll('form button')
    .find((button) => button.text() === 'Primer cliente')!
    .trigger('click');
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(api.createPrivate).toHaveBeenCalledWith(
    expect.objectContaining({
      service: 'training',
      coach: 'other',
      client_ids: ['client'],
      starts_at: '2026-11-05T15:00:00.000Z',
    }),
  );
  expect(wrapper.get('[data-session="pt"]').text()).toContain('Privada');
  wrapper.unmount();
});

it('filtra por tipo y conserva el flujo de generación semanal', async () => {
  sessions.value[0] = {
    ...sessions.value[0]!,
    kind: 'special',
    title: 'Evento',
    template: '',
  };
  sessions.value[1] = { ...sessions.value[1]!, kind: 'private', template: '' };
  api.generate.mockResolvedValue({
    created: 0,
    skipped_existing: 9,
    skipped_blocked: 0,
  });
  const { wrapper, button } = await render();
  const filter = wrapper.get('select[aria-label="Tipo de sesión"]');
  await filter.setValue('special');
  expect(
    wrapper
      .findAll('[data-session]')
      .map((card) => card.attributes('data-session')),
  ).toEqual(['0']);
  await filter.setValue('private');
  expect(
    wrapper
      .findAll('[data-session]')
      .map((card) => card.attributes('data-session')),
  ).toEqual(['1']);
  await filter.setValue('regular');
  expect(wrapper.findAll('[data-session]')).toHaveLength(7);
  await filter.setValue('');
  expect(wrapper.findAll('[data-session]')).toHaveLength(9);
  await button('Generar sesiones').trigger('click');
  await flushPromises();
  expect(api.generate).toHaveBeenCalledWith({ from: '2026-11-01' });
  expect(wrapper.get('[data-session="0"]').text()).toContain('Especial');
  expect(wrapper.get('[data-session="1"]').text()).toContain('Privada');
  wrapper.unmount();
});
