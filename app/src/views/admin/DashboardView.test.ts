import { expectEnglishCopy } from '@/test/copy';
import { withLocale } from '@/test/i18n';
import {
  enableAutoUnmount,
  flushPromises,
  mount,
  RouterLinkStub,
} from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import { afterEach, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import UpcomingPaymentsCard from '@/components/dashboard/UpcomingPaymentsCard.vue';
import type { DashboardSummary } from '@/composables/useDashboard';
import type { PaymentsDue } from '@/composables/usePaymentsDue';
import { roleCan } from '@/lib/permissions';
import type { Role } from '@/types/pb';
import DashboardView from './DashboardView.vue';

const { send, auth } = vi.hoisted(() => ({
  send: vi.fn(),
  auth: { role: 'owner' as Role },
}));
vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({ can: () => roleCan(auth.role, 'payments.manage') }),
}));
vi.mock('@/lib/pocketbase', () => ({ pb: { send } }));
enableAutoUnmount(afterEach);
afterEach(() => {
  send.mockReset();
  auth.role = 'owner';
});

const generated = '2026-11-23T14:00:00Z';
const dashboard: DashboardSummary = {
  generated_at: generated,
  timezone: 'America/New_York',
  today: {
    date: '2026-11-23',
    start_utc: '2026-11-23T05:00:00Z',
    end_utc: '2026-11-24T05:00:00Z',
  },
  counts: {
    active_clients: 42,
    sessions_today: 1,
    bookings_today: 4,
    waitlisted_today: 2,
    sessions_without_coach: 1,
    sessions_without_bookings: 0,
  },
  sessions_today: [
    {
      id: 'jump',
      service: { id: 'service', name: 'Tropical Jump', kind: 'group' },
      starts_at: generated,
      duration_min: 60,
      coach: null,
      status: 'scheduled',
      capacity: 6,
      booked: 4,
      waitlisted: 2,
      spots_left: 2,
      availability: 'almost',
    },
  ],
  attention: [{ session_id: 'jump', reason: 'no_coach', starts_at: generated }],
};

const totals: PaymentsDue['totals'] = {
  overdue_cents: 2700,
  upcoming_cents: 17125,
  overdue_count: 1,
  upcoming_count: 3,
  renewals_count: 0,
};
const global = { plugins: [PrimeVue], stubs: { RouterLink: RouterLinkStub } };

it('muestra métricas, ocupación y cobros reales con enlace a los vencidos', async () => {
  send.mockImplementation((path) =>
    Promise.resolve(path === '/api/admin/dashboard' ? dashboard : { totals }),
  );
  const wrapper = mount(DashboardView, { global });
  await flushPromises();
  for (const name of [
    'Clientes activos',
    'Clases hoy',
    'Reservas hoy',
    'En espera',
  ]) {
    expect(wrapper.text()).toContain(name);
  }
  expect(wrapper.findAll('.tabular-nums').map((node) => node.text())).toEqual([
    '42',
    '1',
    '4',
    '2',
  ]);
  expect(wrapper.text()).toContain('4 / 6 cupos ocupados');
  await withLocale('en', async () => {
    await flushPromises();
    expect(wrapper.text()).toContain('Admin dashboard');
    expectEnglishCopy(wrapper.element);
  });
  expect(wrapper.text()).toContain('Sin coach');
  expect(wrapper.text()).toContain('Casi llena · 2 cupos');
  expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe(
    '67',
  );
  expect(wrapper.text()).toContain('Cobros por vencer');
  expect(wrapper.text()).toContain('3 por vencer en 7 días');
  expect(wrapper.text()).toContain('$171.25');
  expect(wrapper.text()).toContain('1 vencido');
  expect(wrapper.text()).toContain('$27.00');
  expect(send).toHaveBeenCalledWith(
    '/api/admin/payments/due',
    expect.objectContaining({ query: { days: 7, limit: 1 } }),
  );
  expect(
    wrapper
      .getComponent(UpcomingPaymentsCard)
      .getComponent(RouterLinkStub)
      .props('to'),
  ).toEqual({
    path: '/payments',
    query: { overdue: '1' },
  });
  expect(
    wrapper.findAllComponents(RouterLinkStub).map((node) => node.props('to')),
  ).toContainEqual({
    path: '/classes',
    query: { session: 'jump' },
  });
});

it('permite reintentar tras un error de red', async () => {
  let reject!: (error: Error) => void;
  send
    .mockReturnValueOnce(
      new Promise((_resolve, fail) => {
        reject = fail;
      }),
    )
    .mockResolvedValueOnce(dashboard);
  const wrapper = mount(DashboardView, { global });
  await nextTick();
  expect(wrapper.find('[aria-label="Cargando el dashboard"]').exists()).toBe(
    true,
  );
  reject(new Error('offline'));
  await flushPromises();
  expect(wrapper.text()).toContain('Sin conexión con el servidor');
  await wrapper
    .findAll('button')
    .find((button) => button.text() === 'Reintentar')!
    .trigger('click');
  await flushPromises();
  expect(wrapper.text()).toContain('Clientes activos');
});

it('muestra el estado vacío de los cobros', () => {
  const wrapper = mount(UpcomingPaymentsCard, {
    props: {
      loading: false,
      totals: {
        overdue_cents: 0,
        upcoming_cents: 0,
        overdue_count: 0,
        upcoming_count: 0,
        renewals_count: 0,
      },
    },
    global,
  });
  expect(wrapper.text()).toContain('No hay cobros vencidos ni por vencer.');
});

it('oculta los cobros y omite la petición para coach', async () => {
  auth.role = 'coach';
  send.mockResolvedValue(dashboard);
  const wrapper = mount(DashboardView, { global });
  await flushPromises();
  expect(wrapper.findComponent(UpcomingPaymentsCard).exists()).toBe(false);
  expect(send).toHaveBeenCalledTimes(1);
});
