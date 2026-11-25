import { expectEnglishCopy } from '@/test/copy';
import { withLocale } from '@/test/i18n';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import DatePicker from 'primevue/datepicker';
import Select from 'primevue/select';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import ReportsView from './ReportsView.vue';

const { send, getFullList, cancelRequest, download, auth } = vi.hoisted(() => ({
  send: vi.fn(),
  getFullList: vi.fn(),
  cancelRequest: vi.fn(),
  download: vi.fn(),
  auth: { owner: true },
}));

vi.mock('@/lib/pocketbase', () => ({
  pb: { send, cancelRequest, collection: () => ({ getFullList }) },
}));
vi.mock('@/composables/useAuth', async () => {
  const { computed, ref } = await import('vue');
  return {
    useAuth: () => ({
      isOwner: computed(() => auth.owner),
      isAuthenticated: ref(true),
      isActive: ref(true),
    }),
  };
});
vi.mock('@/lib/csv', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/csv')>()),
  downloadCsv: download,
}));

const reportRange = {
  from: '2026-11-01',
  to: '2026-11-30',
  timezone: 'America/New_York',
  start_utc: '2026-11-01T04:00:00.000Z',
  end_utc: '2026-12-01T05:00:00.000Z',
};
const totals = { sessions: 1, capacity: 6, booked: 5, occupancy_rate: 0.8333 };
const occupancy = {
  range: reportRange,
  totals,
  by_service: [{ service: 'fuerza', name: 'Fuerza', ...totals }],
  by_class: [
    {
      session_id: 's1',
      starts_at: '2026-11-04T21:00:00Z',
      local_date: '2026-11-04',
      local_time: '16:00',
      service: 'fuerza',
      coach_name: '=Coach, Muñoz',
      capacity: 6,
      booked: 5,
      waitlisted: 1,
      occupancy_rate: 0.8333,
    },
  ],
};
const revenue = {
  range: reportRange,
  totals: { paid_cents: 26800, pending_cents: 0, void_cents: 0, payments: 1 },
  by_period: [{ period: '2026-11', paid_cents: 26800, payments: 1 }],
  by_plan: [],
  by_service: [],
};

let wrapper: VueWrapper | undefined;

async function render(path = '/reports') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/reports', component: ReportsView }],
  });
  await router.push(path);
  wrapper = mount(ReportsView, {
    global: {
      plugins: [router, PrimeVue],
      stubs: { ReportChart: { template: '<div data-test="chart" />' } },
    },
  });
  await flushPromises();
  return { view: wrapper, router };
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.owner = true;
  getFullList.mockResolvedValue([{ slug: 'fuerza', name: 'Fuerza' }]);
  send.mockImplementation((path: string) =>
    Promise.resolve(path.endsWith('/revenue') ? revenue : occupancy),
  );
});
afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
});

describe('Reportes', () => {
  it('muestra cuatro pestañas al owner y sincroniza la pestaña activa al seleccionarla', async () => {
    const { view, router } = await render();
    await withLocale('en', async () => {
      await flushPromises();
      expect(view.text()).toContain('Reports');
      expectEnglishCopy(view.element);
    });
    const tabs = view.findAll('[role="tab"]');
    expect(tabs.map((entry) => entry.text())).toEqual([
      'Ocupación',
      'Asistencia',
      'Ingresos',
      'Retención',
    ]);
    await tabs[2].trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.query.tab).toBe('revenue');
    expect(view.get('[role="tab"][aria-selected="true"]').text()).toBe(
      'Ingresos',
    );
    expect(view.get('dl').text()).toContain('$268.00');
    expect(view.get('tbody').text()).toContain('$268.00');
  });

  it('muestra tres pestañas al coach y bloquea Ingresos al forzar la URL', async () => {
    auth.owner = false;
    const { view, router } = await render('/reports?tab=revenue');
    expect(view.findAll('[role="tab"]').map((entry) => entry.text())).toEqual([
      'Ocupación',
      'Asistencia',
      'Retención',
    ]);
    expect(view.text()).toContain('No tienes permiso para ver este reporte');
    expect(send).not.toHaveBeenCalled();
    await view.get('[role="tab"]').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.query.tab).toBe('occupancy');
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0][0]).toBe('/api/admin/reports/occupancy');
  });

  it('recarga al completar las fechas o cambiar el servicio y actualiza los resultados', async () => {
    const { view } = await render();
    const picker = view.getComponent(DatePicker);
    picker.vm.$emit('update:modelValue', [new Date(2026, 10, 4), null]);
    await flushPromises();
    expect(send).toHaveBeenCalledOnce();
    picker.vm.$emit('update:modelValue', [
      new Date(2026, 10, 4),
      new Date(2026, 10, 7),
    ]);
    await flushPromises();
    expect(send.mock.calls[1][1].query).toMatchObject({
      from: '2026-11-04',
      to: '2026-11-07',
    });

    send.mockResolvedValueOnce({
      ...occupancy,
      totals: { ...totals, booked: 0 },
      by_service: [],
      by_class: [],
    });
    view.findAllComponents(Select)[0].vm.$emit('update:modelValue', 'fuerza');
    await flushPromises();
    expect(send.mock.calls[2][1].query).toMatchObject({ service: 'fuerza' });
    expect(view.get('dl').text()).toContain('Reservas0');
    expect(view.get('tbody').text()).toBe('Sin datos en el rango');
  });

  it('exporta el detalle visible con BOM y neutraliza las fórmulas', async () => {
    const { view } = await render();
    expect(view.get('tbody').text()).toContain('=Coach, Muñoz');
    const button = view
      .findAll('button')
      .find((item) => item.text() === 'Exportar CSV');
    expect(button).toBeDefined();
    await button!.trigger('click');
    expect(download).toHaveBeenCalledWith(
      'jq-reports-ocupacion-2026-11-01_2026-11-30.csv',
      '\uFEFFFecha,Hora,Servicio,Coach,Cupos,Reservas,Lista de espera,Ocupación\r\n2026-11-04,16:00,Fuerza,"\'=Coach, Muñoz",6,5,1,83.3%',
    );
  });
});
