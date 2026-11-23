import { flushPromises, mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Booking, SessionAvailability } from '@/lib/bookings';
import type { Client } from '@/lib/clients';
import type { ClassSession } from '@/lib/schedule-week';
import AvailabilityTag from './AvailabilityTag.vue';
import BookingDialog from './BookingDialog.vue';
import CancelBookingDialog from './CancelBookingDialog.vue';
import SessionRoster from './SessionRoster.vue';

const api = vi.hoisted(() => ({
  create: vi.fn(),
  cancel: vi.fn(),
  listBySession: vi.fn(),
  markAttendance: vi.fn(),
  hasFreeClassPlan: vi.fn(),
  get: vi.fn(),
  can: vi.fn(),
}));
vi.mock('@/composables/useAuth', () => ({ useAuth: () => ({ can: api.can }) }));
vi.mock('@/composables/useBookings', () => ({ useBookings: () => api }));
vi.mock('@/composables/useSessionAvailability', () => ({
  useSessionAvailability: () => api,
}));

const time = '2026-11-22T18:00:00Z';
const session: ClassSession = {
  id: 'session',
  collectionId: 'sessions',
  collectionName: 'class_sessions',
  template: '',
  service: 'strength',
  coach: '',
  starts_at: '2026-11-22T21:00:00Z',
  duration_min: 60,
  capacity: 1,
  status: 'scheduled',
  kind: 'regular',
  cancel_reason: '',
  notes: '',
};
const client: Client = {
  id: 'client',
  collectionId: 'clients',
  collectionName: 'clients',
  first_name: 'Ana',
  last_name: 'López',
  email: '',
  phone: '',
  status: 'active',
  goals: '',
  notes: '',
  assessment: null,
  free_class_used: false,
  joined_on: '',
  emergency_contact: '',
};
const booking: Booking = {
  id: 'booking',
  collectionId: 'bookings',
  collectionName: 'bookings',
  session: session.id,
  client: client.id,
  status: 'booked',
  waitlist_position: 0,
  cancelled_at: '',
  marked_by: '',
  source: 'admin',
  override_note: '',
  free_class: false,
  expand: { client },
};
const availability: SessionAvailability = {
  session: session.id,
  capacity: 1,
  booked: 1,
  waitlisted: 0,
  spots_left: 0,
  availability: 'full',
  cancellation_deadline: '2026-11-22T17:00:00Z',
};
const global = {
  plugins: [PrimeVue],
  stubs: {
    Dialog: {
      props: ['visible'],
      template: '<section v-if="visible"><slot /></section>',
    },
    ClientPicker: true,
  },
};
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(new Date(time));
  api.get.mockResolvedValue(availability);
  api.can.mockReturnValue(true);
  api.hasFreeClassPlan.mockResolvedValue(true);
  api.listBySession.mockResolvedValue([booking]);
});
afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

it('warns about the waitlist and offers a free class to an eligible client', async () => {
  const wrapper = mount(BookingDialog, {
    props: { modelValue: true, session, client },
    global,
  });
  await flushPromises();
  expect(wrapper.text()).toContain('Se añadirá a la lista de espera');
  expect(wrapper.text()).toContain('Primera clase gratis');
  const saved = { ...booking, status: 'waitlisted' };
  api.create.mockResolvedValue(saved);
  await wrapper.get('input[type=checkbox]').setValue(true);
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(api.create).toHaveBeenCalledWith({
    session: session.id,
    client: client.id,
    useFreeClass: true,
  });
  expect(wrapper.emitted('booked')).toEqual([[saved]]);
  wrapper.unmount();
});

it('displays the local deadline and requires a note for a late exception', async () => {
  const wrapper = mount(CancelBookingDialog, {
    props: { modelValue: true, booking, startsAt: session.starts_at },
    global,
  });
  await flushPromises();
  expect(wrapper.text()).toContain('12:00');
  expect(wrapper.text()).toContain('tardía');
  await wrapper.get('input[type=checkbox]').setValue(true);
  await wrapper.get('form').trigger('submit');
  expect(wrapper.text()).toContain('Indica el motivo');
  expect(api.cancel).not.toHaveBeenCalled();
  await wrapper.get('textarea').setValue(' Emergencia ');
  api.cancel.mockResolvedValue({ ...booking, status: 'cancelled' });
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(api.cancel).toHaveBeenCalledWith(booking.id, {
    overrideNote: 'Emergencia',
  });
  wrapper.unmount();
});

it('disables attendance before the start and opens it when the class begins', async () => {
  const wrapper = mount(SessionRoster, { props: { session }, global });
  await flushPromises();
  const button = () =>
    wrapper.findAll('button').find((item) => item.text() === 'Asistió')!;
  expect(button().attributes('disabled')).toBeDefined();
  vi.setSystemTime(new Date(session.starts_at));
  await vi.advanceTimersByTimeAsync(1000);
  expect(button().attributes('disabled')).toBeUndefined();
  api.markAttendance.mockResolvedValue({ ...booking, status: 'attended' });
  await button().trigger('click');
  await flushPromises();
  expect(api.markAttendance).toHaveBeenCalledWith(
    booking.id,
    'attended',
    undefined,
  );
  wrapper.unmount();
});

it('hides the free class for an ineligible client or a service without a plan', async () => {
  api.get.mockResolvedValue({
    ...availability,
    availability: 'almost',
    spots_left: 1,
  });
  const wrapper = mount(BookingDialog, {
    props: {
      modelValue: true,
      session,
      client: { ...client, free_class_used: true },
    },
    global,
  });
  await flushPromises();
  expect(wrapper.text()).not.toContain('Se añadirá a la lista de espera');
  expect(wrapper.text()).not.toContain('Primera clase gratis');
  api.hasFreeClassPlan.mockResolvedValue(false);
  await wrapper.setProps({ client, session: { ...session, id: 'other' } });
  await flushPromises();
  expect(wrapper.text()).not.toContain('Primera clase gratis');
  wrapper.unmount();
});

it.each([
  { status: 'booked', deadline: '2026-11-22T20:00:00Z' },
  { status: 'waitlisted', deadline: availability.cancellation_deadline },
] as const)(
  'does not request a note when the cancellation is penalty-free: $status',
  async ({ status, deadline }) => {
    api.get.mockResolvedValue({
      ...availability,
      cancellation_deadline: deadline,
    });
    api.cancel.mockResolvedValue({ ...booking, status: 'cancelled' });
    const wrapper = mount(CancelBookingDialog, {
      props: {
        modelValue: true,
        booking: { ...booking, status },
        startsAt: session.starts_at,
      },
      global,
    });
    await flushPromises();
    expect(wrapper.find('textarea').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('tardía');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(api.cancel).toHaveBeenCalledWith(booking.id, {
      overrideNote: undefined,
    });
    wrapper.unmount();
  },
);

it('shows the waitlist without attendance actions even after the scheduled time', async () => {
  vi.setSystemTime(new Date(session.starts_at));
  api.listBySession.mockResolvedValue([
    { ...booking, status: 'waitlisted', waitlist_position: 1 },
  ]);
  const wrapper = mount(SessionRoster, { props: { session }, global });
  await flushPromises();
  const table = wrapper.get('table[aria-label="Lista de espera"]');
  expect(table.text()).toContain('Ana López');
  expect(table.findAll('button')).toHaveLength(0);
  expect(api.markAttendance).not.toHaveBeenCalled();
  wrapper.unmount();
});

it.each([
  ['available', 3, 'Disponible · 3 cupos', 'success'],
  ['almost', 1, 'Casi llena · 1 cupo', 'warn'],
  ['full', 0, 'Llena · 0 cupos', 'danger'],
] as const)(
  'renders %s without using the other states',
  (availability, spotsLeft, label, severity) => {
    const wrapper = mount(AvailabilityTag, {
      props: { availability, spotsLeft },
      global,
    });
    expect(wrapper.text()).toBe(label);
    expect(wrapper.classes()).toContain('p-tag-' + severity);
  },
);

it.each(['no_credits', 'weekly_limit'])(
  'solicita una nota y reenvía la reserva ante %s',
  async (code) => {
    const wrapper = mount(BookingDialog, {
      props: { modelValue: true, session, client },
      global,
    });
    await flushPromises();
    api.create.mockRejectedValueOnce({
      code,
      status: 400,
      message: 'Sin créditos disponibles.',
      fields: {},
    });
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    const forms = wrapper.findAll('form');
    expect(forms).toHaveLength(2);
    await forms[1].trigger('submit');
    expect(wrapper.text()).toContain('Indica el motivo de la excepción');
    expect(api.create).toHaveBeenCalledTimes(1);
    await forms[1].get('textarea').setValue(' Excepción aprobada ');
    api.create.mockResolvedValueOnce(booking);
    await forms[1].trigger('submit');
    await flushPromises();
    expect(api.create).toHaveBeenLastCalledWith({
      session: session.id,
      client: client.id,
      useFreeClass: false,
      overrideNote: 'Excepción aprobada',
    });
    expect(wrapper.emitted('booked')).toEqual([[booking]]);
    wrapper.unmount();
  },
);

it('muestra el error sin solicitar excepción cuando el rol es de consulta', async () => {
  api.can.mockReturnValue(false);
  api.create.mockRejectedValueOnce({
    code: 'no_credits',
    status: 400,
    message: 'Sin créditos disponibles.',
    fields: {},
  });
  const wrapper = mount(BookingDialog, {
    props: { modelValue: true, session, client },
    global,
  });
  await flushPromises();
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(wrapper.findAll('form')).toHaveLength(1);
  expect(wrapper.text()).toContain('Sin créditos disponibles.');
  wrapper.unmount();
});
